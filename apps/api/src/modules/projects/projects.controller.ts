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
  CreateProjectFromSourceDto,
  InviteProjectMemberDto,
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

  @Get('featured/landing-page')
  @ApiOperation({ summary: 'Get projects featured on the landing page (public, no auth)' })
  async findFeatured() {
    return this.projectsService.findFeatured();
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

  @Post('from-source')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Create a project from a GitHub repo source',
    description:
      'Automatically derives the project name from the repo, generates an AI description, and assigns the source.',
  })
  @ApiBody({ type: CreateProjectFromSourceDto })
  async createFromSource(
    @Body() dto: CreateProjectFromSourceDto,
    @Request() req: any,
  ) {
    return this.projectsService.createFromSource(dto, req.user.id);
  }

  @Put(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update a project (requires lead role)' })
  @ApiBody({ type: UpdateProjectDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @Request() req: any,
  ) {
    return this.projectsService.update(id, dto, req.user.sub);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete a project (requires lead role)' })
  async remove(@Param('id') id: string, @Request() req: any) {
    return this.projectsService.remove(id, req.user.sub);
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
  @ApiOperation({ summary: 'Assign a knowledge source (requires lead or contributor role)' })
  @ApiBody({ type: AddProjectSourceDto })
  async addSource(
    @Param('id') id: string,
    @Body() dto: AddProjectSourceDto,
    @Request() req: any,
  ) {
    return this.projectsService.addSource(id, dto, req.user.sub);
  }

  @Delete(':id/sources/:sourceId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Remove a source (requires lead or contributor role)' })
  async removeSource(
    @Param('id') id: string,
    @Param('sourceId') sourceId: string,
    @Request() req: any,
  ) {
    return this.projectsService.removeSource(id, sourceId, req.user.sub);
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
    summary: 'Add a team member (requires lead role)',
    description: 'Invite a user by email. They must have signed in at least once.',
  })
  @ApiBody({ type: AddProjectMemberDto })
  async addMember(
    @Param('id') id: string,
    @Body() dto: AddProjectMemberDto,
    @Request() req: any,
  ) {
    return this.projectsService.addMember(id, dto, req.user.sub);
  }

  @Put(':id/members/:userId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update a team member role (requires lead role)' })
  @ApiBody({ type: UpdateProjectMemberDto })
  async updateMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateProjectMemberDto,
    @Request() req: any,
  ) {
    return this.projectsService.updateMember(id, userId, dto, req.user.sub);
  }

  @Delete(':id/members/:userId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Remove a team member (requires lead role)' })
  async removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Request() req: any,
  ) {
    return this.projectsService.removeMember(id, userId, req.user.sub);
  }

  // ─── Invitations ─────────────────────────────────────────

  @Post(':id/invitations')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Invite a user to the project via email (requires lead role)',
    description:
      'Sends an invitation email to the specified address. Works even if the user does not have an account yet.',
  })
  @ApiBody({ type: InviteProjectMemberDto })
  async inviteMember(
    @Param('id') id: string,
    @Body() dto: InviteProjectMemberDto,
    @Request() req: any,
  ) {
    return this.projectsService.inviteMember(id, dto, req.user.sub);
  }

  @Get(':id/invitations')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List all invitations for a project' })
  async listInvitations(@Param('id') id: string) {
    return this.projectsService.listInvitations(id);
  }

  @Get('invitations/by-token/:token')
  @ApiOperation({
    summary: 'Get invitation details by token (public)',
    description: 'Returns invitation details without requiring authentication, so the accept page can show project info.',
  })
  async getInvitationByToken(@Param('token') token: string) {
    return this.projectsService.getInvitationByToken(token);
  }

  @Post('invitations/:token/accept')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Accept an invitation',
    description:
      'Accepts the invitation and adds the current user to the project. User must be authenticated.',
  })
  async acceptInvitation(@Param('token') token: string, @Request() req: any) {
    return this.projectsService.acceptInvitation(token, req.user.sub);
  }

  @Delete(':id/invitations/:invitationId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cancel a pending invitation (requires lead role)' })
  async cancelInvitation(
    @Param('id') id: string,
    @Param('invitationId') invitationId: string,
    @Request() req: any,
  ) {
    return this.projectsService.cancelInvitation(id, invitationId, req.user.sub);
  }

  @Post(':id/invitations/:invitationId/resend')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Resend an invitation email (requires lead role)' })
  async resendInvitation(
    @Param('id') id: string,
    @Param('invitationId') invitationId: string,
    @Request() req: any,
  ) {
    return this.projectsService.resendInvitation(id, invitationId, req.user.sub);
  }

  // ─── AI Summary ───────────────────────────────────────────

  @Post(':id/summary')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Generate an AI summary (requires lead or contributor role)',
    description:
      'Uses the LLM to analyze all assigned sources and generate a comprehensive project summary.',
  })
  async generateSummary(@Param('id') id: string, @Request() req: any) {
    return this.projectsService.generateSummary(id, req.user.sub);
  }

  // ─── Ownership Transfer ─────────────────────────────────

  @Post(':id/transfer-ownership')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Transfer project ownership to another member (requires lead role)',
    description:
      'Promotes the target member to lead and demotes the current lead to contributor.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['newOwnerId'],
      properties: { newOwnerId: { type: 'string', format: 'uuid' } },
    },
  })
  async transferOwnership(
    @Param('id') id: string,
    @Body('newOwnerId') newOwnerId: string,
    @Request() req: any,
  ) {
    return this.projectsService.transferOwnership(id, newOwnerId, req.user.sub);
  }

  // ─── User's Role in Project ──────────────────────────────

  @Get(':id/my-role')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get the current user\'s role in a project' })
  async getMyRole(@Param('id') id: string, @Request() req: any) {
    const role = await this.projectsService.getUserRole(id, req.user.sub);
    return { role };
  }
}
