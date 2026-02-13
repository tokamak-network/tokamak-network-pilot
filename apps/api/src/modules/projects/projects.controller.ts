import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import {
  CreateProjectDto,
  UpdateProjectDto,
  AddProjectMemberDto,
  UpdateProjectMemberDto,
  AddProjectSourceDto,
} from './dto/project.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  // ─── Project CRUD ─────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List all projects' })
  async findAll() {
    return this.projectsService.findAll();
  }

  @Get(':idOrSlug')
  @ApiOperation({ summary: 'Get project details by ID or slug' })
  @ApiParam({ name: 'idOrSlug', description: 'Project UUID or slug' })
  async findOne(@Param('idOrSlug') idOrSlug: string) {
    return this.projectsService.findOne(idOrSlug);
  }

  @Get(':idOrSlug/dashboard')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get project dashboard with stats' })
  @ApiParam({ name: 'idOrSlug', description: 'Project UUID or slug' })
  async getDashboard(@Param('idOrSlug') idOrSlug: string) {
    // Resolve to UUID first
    const project = await this.projectsService.findOne(idOrSlug);
    return this.projectsService.getDashboard(project.id);
  }

  @Get(':slug/public')
  @ApiOperation({ summary: 'Get public project overview page' })
  @ApiParam({ name: 'slug', description: 'Project slug' })
  async findPublic(@Param('slug') slug: string) {
    return this.projectsService.findPublic(slug);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Create a new project',
    description: 'Creates a project and adds you as the project lead.',
  })
  @ApiBody({ type: CreateProjectDto })
  async create(@Body() dto: CreateProjectDto, @Request() req: any) {
    return this.projectsService.create(dto, req.user.id);
  }

  @Put(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update a project' })
  @ApiBody({ type: UpdateProjectDto })
  async update(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projectsService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete a project' })
  async remove(@Param('id') id: string) {
    return this.projectsService.remove(id);
  }

  // ─── Source Mapping ───────────────────────────────────────

  @Get(':id/sources')
  @ApiOperation({ summary: 'List sources assigned to this project' })
  async listSources(@Param('id') id: string) {
    return this.projectsService.listSources(id);
  }

  @Post(':id/sources')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Assign a knowledge source to this project' })
  @ApiBody({ type: AddProjectSourceDto })
  async addSource(@Param('id') id: string, @Body() dto: AddProjectSourceDto) {
    return this.projectsService.addSource(id, dto);
  }

  @Delete(':id/sources/:sourceId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Remove a source from this project' })
  async removeSource(
    @Param('id') id: string,
    @Param('sourceId') sourceId: string,
  ) {
    return this.projectsService.removeSource(id, sourceId);
  }

  // ─── Team Members ─────────────────────────────────────────

  @Get(':id/members')
  @ApiOperation({ summary: 'List project team members' })
  async listMembers(@Param('id') id: string) {
    return this.projectsService.listMembers(id);
  }

  @Post(':id/members')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Add a team member to the project',
    description: 'Invite a user by email. They must have signed in at least once.',
  })
  @ApiBody({ type: AddProjectMemberDto })
  async addMember(@Param('id') id: string, @Body() dto: AddProjectMemberDto) {
    return this.projectsService.addMember(id, dto);
  }

  @Put(':id/members/:userId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update a team member role' })
  @ApiBody({ type: UpdateProjectMemberDto })
  async updateMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateProjectMemberDto,
  ) {
    return this.projectsService.updateMember(id, userId, dto);
  }

  @Delete(':id/members/:userId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Remove a team member from the project' })
  async removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.projectsService.removeMember(id, userId);
  }

  // ─── AI Summary ───────────────────────────────────────────

  @Post(':id/summary')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Generate an AI summary for the project',
    description:
      'Uses the LLM to analyze all assigned sources and generate a comprehensive project summary.',
  })
  async generateSummary(@Param('id') id: string) {
    return this.projectsService.generateSummary(id);
  }
}
