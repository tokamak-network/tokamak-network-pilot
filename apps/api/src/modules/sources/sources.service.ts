import { Injectable, Logger } from '@nestjs/common';

/**
 * Source types the system can ingest:
 *  - github_repo: Full GitHub repository (code, docs, issues, PRs)
 *  - github_org: All repos in a GitHub org
 *  - documentation: External documentation URLs
 *  - file_upload: Uploaded files (PDF, MD, TXT, etc.)
 *  - notion: Notion workspace pages
 *  - custom: Custom webhook / API source
 */
export type SourceType =
  | 'github_repo'
  | 'github_org'
  | 'documentation'
  | 'file_upload'
  | 'notion'
  | 'custom';

@Injectable()
export class SourcesService {
  private readonly logger = new Logger(SourcesService.name);

  async findAll() {
    // TODO: Fetch from database
    return { sources: [], total: 0 };
  }

  async findOne(id: string) {
    // TODO: Fetch from database
    return { id, message: 'Source not found (not yet implemented)' };
  }

  async create(data: any) {
    this.logger.log('Creating new source:', data);
    // TODO: Validate, persist, trigger initial indexing
    return { message: 'Source creation not yet implemented', data };
  }

  async update(id: string, data: any) {
    this.logger.log(`Updating source ${id}:`, data);
    // TODO: Update in database
    return { message: 'Source update not yet implemented', id, data };
  }

  async remove(id: string) {
    this.logger.log(`Removing source ${id}`);
    // TODO: Remove from DB + vector store
    return { message: 'Source removal not yet implemented', id };
  }

  async sync(id: string) {
    this.logger.log(`Triggering sync for source ${id}`);
    // TODO: Queue re-indexing job
    return { message: 'Source sync not yet implemented', id };
  }
}
