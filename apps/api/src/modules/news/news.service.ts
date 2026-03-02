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
    const projectContext = this.buildProjectContext(project);

    const systemPrompt = [
      `You are the official social media voice for "${project.name}".`,
      'Your job is to create posts that connect external news to this specific project,',
      'showing why the news matters to the project and its community.',
      '',
      '=== PROJECT IDENTITY ===',
      projectContext,
      '',
      '=== PLATFORM GUIDELINES ===',
      platformInstructions,
      '',
      customPrompt ? `=== CUSTOM INSTRUCTIONS ===\n${customPrompt}\n` : '',
      '=== CRITICAL RULES ===',
      '- Write ONLY the post content. No explanations or meta-commentary.',
      '- ALWAYS tie the news back to the project. Explain why this news is relevant to the project.',
      '- Write FROM the perspective of the project (use "we", "our", "us" naturally).',
      '- Mention the project name at least once.',
      '- If the project has relevant links (website, GitHub, docs), reference them when appropriate.',
      '- Show how this news validates, impacts, or relates to what the project is building.',
      '- Be engaging, authentic, and community-oriented.',
      '- Include relevant hashtags including project-specific ones.',
    ]
      .filter(Boolean)
      .join('\n');

    const userMessage = [
      'Create a social media post that connects this news article to our project:',
      '',
      '--- NEWS ARTICLE ---',
      `Title: ${article.title}`,
      article.description ? `Summary: ${article.description}` : '',
      `Source: ${article.source || 'Unknown'}`,
      `Link: ${article.url}`,
      '',
      '--- TASK ---',
      `Write a ${platform} post from ${project.name}'s perspective that:`,
      '1. References the key takeaway from this news',
      '2. Explains why it matters to our project and community',
      '3. Positions our project in relation to this development',
    ]
      .filter(Boolean)
      .join('\n');

    const result = await this.llm.chatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
      maxTokens: 800,
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

  private buildProjectContext(project: Project): string {
    const parts: string[] = [
      `Project name: ${project.name}`,
      `Slug: ${project.slug}`,
    ];

    if (project.description) {
      parts.push(`Description: ${project.description}`);
    }

    if (project.summary) {
      parts.push(`About: ${project.summary}`);
    }

    if (project.links && project.links.length > 0) {
      const linkList = project.links
        .map((l) => `  - ${l.label}: ${l.url}`)
        .join('\n');
      parts.push(`Links:\n${linkList}`);
    }

    if (project.newsKeywords && project.newsKeywords.length > 0) {
      parts.push(`Key topics: ${project.newsKeywords.join(', ')}`);
    }

    return parts.join('\n');
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
    '- Punchy, concise tone that shows the project\'s take on the news.',
    '- Include 2-3 hashtags (at least one project-specific).',
    '- Emojis are fine sparingly.',
    '- End with the article URL if space permits.',
    '- Make it clear why the project cares about this news.',
  ].join('\n'),

  linkedin: [
    'Platform: LinkedIn',
    '- Professional, thought-leadership tone.',
    '- 150-300 words.',
    '- Start with a hook that connects the news to the project\'s mission.',
    '- Use line breaks for readability.',
    '- Explain the project\'s perspective on why this news matters to the industry.',
    '- Include 3-5 hashtags at the end (include project name as hashtag).',
    '- End with a discussion question that invites community engagement.',
    '- Include the article URL.',
  ].join('\n'),

  instagram: [
    'Platform: Instagram',
    '- Engaging, community-oriented language.',
    '- 100-200 words for the caption.',
    '- Start with a hook that frames the news through the project\'s lens.',
    '- Use emojis to add personality and break up text.',
    '- Highlight what the project is doing in relation to this news.',
    '- Include 10-15 hashtags at the end (include project-specific ones).',
    '- Call-to-action (e.g., "Link in bio", "Follow for more updates").',
    '- Do NOT include URLs (Instagram captions are not clickable).',
  ].join('\n'),
};
