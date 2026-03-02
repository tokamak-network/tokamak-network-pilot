import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { XMLParser } from 'fast-xml-parser';
import { createHash } from 'crypto';
import { Project } from '../../entities/project.entity';
import { ProjectNews } from '../../entities/project-news.entity';
import { LlmService } from '../llm/llm.service';
import type { SocialPlatform } from './dto/news.dto';

interface RssItem {
  title: string;
  link: string;
  description?: string;
  pubDate?: string;
  source?: string | { '#text': string; '@_url'?: string };
}

@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);
  private readonly xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  });

  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(ProjectNews)
    private readonly newsRepo: Repository<ProjectNews>,
    private readonly llm: LlmService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async syncAllProjectNews() {
    this.logger.log('Starting scheduled news sync for all projects');
    const projects = await this.projectRepo.find({
      where: { isNewsEnabled: true },
    });

    if (projects.length === 0) {
      this.logger.log('No projects have news enabled, skipping');
      return;
    }

    this.logger.log(`Syncing news for ${projects.length} project(s)`);

    for (const project of projects) {
      try {
        await this.syncProjectNews(project);
      } catch (err) {
        this.logger.error(
          `Failed to sync news for project ${project.slug}: ${err}`,
        );
      }
    }

    this.logger.log('Scheduled news sync complete');
  }

  async syncProjectNews(project: Project): Promise<number> {
    const keywords = this.getSearchKeywords(project);
    const query = keywords.join(' OR ');
    const articles = await this.fetchGoogleNewsRss(query);

    let inserted = 0;
    for (const article of articles) {
      const externalId = this.hashArticle(article.url);
      const exists = await this.newsRepo.findOne({
        where: { projectId: project.id, externalId },
      });
      if (exists) continue;

      const news = this.newsRepo.create({
        projectId: project.id,
        title: article.title,
        description: article.description,
        url: article.url,
        source: article.source,
        imageUrl: article.imageUrl,
        publishedAt: article.publishedAt,
        externalId,
      });
      await this.newsRepo.save(news);
      inserted++;
    }

    this.logger.log(
      `Synced ${inserted} new article(s) for project "${project.slug}" (${articles.length} total fetched)`,
    );
    return inserted;
  }

  async triggerSync(projectId: string): Promise<{ synced: number }> {
    const project = await this.projectRepo.findOneOrFail({
      where: { id: projectId },
    });
    const synced = await this.syncProjectNews(project);
    return { synced };
  }

  async getProjectNews(
    projectId: string,
    page = 1,
    limit = 20,
    search?: string,
  ) {
    const where: Record<string, unknown> = { projectId };
    if (search) {
      where.title = ILike(`%${search}%`);
    }

    const [data, total] = await this.newsRepo.findAndCount({
      where,
      order: { publishedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
      hasMore: page * limit < total,
    };
  }

  async deleteNewsArticle(articleId: string, projectId: string) {
    const article = await this.newsRepo.findOne({
      where: { id: articleId, projectId },
    });
    if (!article) return { deleted: false };
    await this.newsRepo.remove(article);
    return { deleted: true };
  }

  async generateSocialPost(
    articleId: string,
    projectId: string,
    platform: SocialPlatform,
    customPrompt?: string,
  ) {
    const article = await this.newsRepo.findOne({
      where: { id: articleId, projectId },
    });
    if (!article) throw new NotFoundException('News article not found');

    const project = await this.projectRepo.findOneOrFail({
      where: { id: projectId },
    });

    const platformInstructions = PLATFORM_PROMPTS[platform];

    const systemPrompt = [
      'You are a professional social media content creator for a Web3/blockchain project.',
      `Project name: "${project.name}".`,
      project.description
        ? `Project description: "${project.description}".`
        : '',
      '',
      platformInstructions,
      '',
      customPrompt ? `Additional instructions: ${customPrompt}` : '',
      '',
      'IMPORTANT RULES:',
      '- Write ONLY the post content, no explanations or meta-commentary.',
      '- Be engaging but professional.',
      '- Include relevant hashtags where appropriate for the platform.',
      '- Reference the article source or link naturally.',
      '- Keep the tone informative and exciting, aligned with crypto/blockchain community.',
    ]
      .filter(Boolean)
      .join('\n');

    const userMessage = [
      'Generate a social media post based on this news article:',
      '',
      `Title: ${article.title}`,
      article.description ? `Description: ${article.description}` : '',
      `Source: ${article.source || 'Unknown'}`,
      `URL: ${article.url}`,
    ]
      .filter(Boolean)
      .join('\n');

    const result = await this.llm.chatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
      maxTokens: 600,
    });

    return {
      content: result.content,
      platform,
      articleId: article.id,
      articleTitle: article.title,
      provider: result.provider,
      model: result.model,
    };
  }

  private getSearchKeywords(project: Project): string[] {
    if (project.newsKeywords && project.newsKeywords.length > 0) {
      return project.newsKeywords;
    }
    return [project.name];
  }

  private async fetchGoogleNewsRss(
    query: string,
  ): Promise<
    Array<{
      title: string;
      url: string;
      description?: string;
      source?: string;
      imageUrl?: string;
      publishedAt?: Date;
    }>
  > {
    const encodedQuery = encodeURIComponent(query);
    const rssUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=en-US&gl=US&ceid=US:en`;

    try {
      const response = await fetch(rssUrl, {
        headers: {
          'User-Agent': 'TokamakPilot/1.0 NewsAggregator',
        },
      });

      if (!response.ok) {
        throw new Error(`Google News RSS returned ${response.status}`);
      }

      const xml = await response.text();
      const parsed = this.xmlParser.parse(xml);
      const channel = parsed?.rss?.channel;
      if (!channel?.item) return [];

      const items: RssItem[] = Array.isArray(channel.item)
        ? channel.item
        : [channel.item];

      return items.slice(0, 50).map((item) => ({
        title: this.cleanHtml(String(item.title || '')),
        url: String(item.link || ''),
        description: item.description
          ? this.cleanHtml(String(item.description)).slice(0, 500)
          : undefined,
        source: this.extractSource(item.source),
        publishedAt: item.pubDate ? new Date(item.pubDate) : undefined,
      }));
    } catch (err) {
      this.logger.error(`Failed to fetch Google News RSS: ${err}`);
      return [];
    }
  }

  private extractSource(
    source: RssItem['source'],
  ): string | undefined {
    if (!source) return undefined;
    if (typeof source === 'string') return source;
    return source['#text'] || undefined;
  }

  private cleanHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  private hashArticle(url: string): string {
    return createHash('sha256').update(url).digest('hex').slice(0, 64);
  }
}

const PLATFORM_PROMPTS: Record<SocialPlatform, string> = {
  twitter: [
    'Platform: Twitter/X',
    '- Maximum 280 characters (strict limit).',
    '- Use a punchy, concise tone.',
    '- Include 2-3 relevant hashtags.',
    '- You may use emojis sparingly for engagement.',
    '- End with the article URL if space permits, otherwise just the key message.',
  ].join('\n'),

  linkedin: [
    'Platform: LinkedIn',
    '- Professional and insightful tone.',
    '- 150-300 words for good engagement.',
    '- Start with a hook (question, bold statement, or statistic).',
    '- Use line breaks for readability.',
    '- Include 3-5 relevant hashtags at the end.',
    '- Encourage discussion with a question at the end.',
    '- Include the article URL.',
  ].join('\n'),

  instagram: [
    'Platform: Instagram',
    '- Engaging, visual-first language.',
    '- 100-200 words for the caption.',
    '- Start with a compelling hook.',
    '- Use emojis to add personality and break up text.',
    '- Include 10-15 relevant hashtags at the very end (after a line break).',
    '- Include a call-to-action (e.g., "Link in bio", "Save for later").',
    '- Do NOT include the URL in the caption (Instagram captions are not clickable).',
  ].join('\n'),
};
