import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { ChangelogService, ChangeType } from './changelog.service';

@ApiTags('changelog')
@Controller('changelog')
export class ChangelogController {
  constructor(private readonly changelogService: ChangelogService) {}

  @Get()
  @ApiOperation({
    summary: 'Get API changelog',
    description:
      'Returns all changelog entries with version numbers, dates, and categorized changes. ' +
      'Optionally filter by change type (added, changed, fixed, deprecated, removed, security).',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['added', 'changed', 'fixed', 'deprecated', 'removed', 'security'],
    description: 'Filter by change type',
  })
  getChangelog(@Query('type') type?: ChangeType) {
    const entries = this.changelogService.getAll(type);
    return { entries, total: entries.length };
  }

  @Get('latest')
  @ApiOperation({
    summary: 'Get the latest changelog entry',
    description: 'Returns only the most recent version changelog.',
  })
  getLatest() {
    return this.changelogService.getLatest();
  }

  @Get(':version')
  @ApiOperation({
    summary: 'Get changelog for a specific version',
    description: 'Returns the changelog entry for the given version number.',
  })
  @ApiParam({
    name: 'version',
    description: 'Version number (e.g. 0.1.0)',
  })
  getByVersion(@Param('version') version: string) {
    const entry = this.changelogService.getByVersion(version);
    if (!entry) {
      return { message: `No changelog found for version ${version}` };
    }
    return entry;
  }
}
