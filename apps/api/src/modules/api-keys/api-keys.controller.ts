import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';

@ApiTags('api-keys')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new API key',
    description:
      'Generate a new API key for the authenticated user. The plaintext key is returned **once** in the response — store it securely.',
  })
  @ApiResponse({ status: 201, description: 'API key created. The `key` field contains the secret — save it now.' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async create(@Body() dto: CreateApiKeyDto, @Request() req: any) {
    return this.apiKeysService.create(dto, req.user.sub);
  }

  @Get()
  @ApiOperation({
    summary: 'List your API keys',
    description: 'Returns all API keys belonging to the authenticated user (secrets are never shown).',
  })
  async findAll(@Request() req: any) {
    return this.apiKeysService.findAllByOwner(req.user.sub);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get API key details',
    description: 'Retrieve details of a specific API key you own.',
  })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.apiKeysService.findOne(id, req.user.sub);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update an API key',
    description: 'Update the name, scopes, active status, or metadata of your API key.',
  })
  @ApiResponse({ status: 200, description: 'API key updated' })
  @ApiResponse({ status: 403, description: 'Not your API key' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateApiKeyDto,
    @Request() req: any,
  ) {
    return this.apiKeysService.update(id, dto, req.user.sub);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Revoke an API key',
    description: 'Permanently delete an API key. This action cannot be undone.',
  })
  @ApiResponse({ status: 200, description: 'API key revoked' })
  @ApiResponse({ status: 403, description: 'Not your API key' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async remove(@Param('id') id: string, @Request() req: any) {
    return this.apiKeysService.remove(id, req.user.sub);
  }

  @Post(':id/rotate')
  @ApiOperation({
    summary: 'Rotate an API key',
    description:
      'Generate a new secret for this key, invalidating the old one. The new plaintext key is returned **once**.',
  })
  @ApiResponse({ status: 200, description: 'Key rotated. The `key` field contains the new secret.' })
  @ApiResponse({ status: 403, description: 'Not your API key' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async rotate(@Param('id') id: string, @Request() req: any) {
    return this.apiKeysService.rotate(id, req.user.sub);
  }

  @Get(':id/usage')
  @ApiOperation({
    summary: 'Get usage history for an API key',
    description: 'Returns paginated usage logs for a specific API key you own.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiResponse({ status: 200, description: 'Usage logs returned' })
  @ApiResponse({ status: 403, description: 'Not your API key' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async getUsage(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Request() req?: any,
  ) {
    return this.apiKeysService.getUsage(
      id,
      req.user.sub,
      page ? Number(page) : 1,
      limit ? Number(limit) : 50,
    );
  }
}
