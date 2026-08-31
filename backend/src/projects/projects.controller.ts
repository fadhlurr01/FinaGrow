import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto, ProjectFilterDto } from './dto/project.dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('api/v1/projects')
@UseGuards(SessionAuthGuard, TenantGuard, RolesGuard)
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Get()
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getProjects(
    @CurrentTenant('id') organizationId: string,
    @Query() filter: ProjectFilterDto,
  ) {
    return this.projectsService.getProjects(organizationId, filter);
  }

  @Get('metrics/summary')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getMetrics(
    @CurrentTenant('id') organizationId: string,
    @Query('entityId') entityId?: string,
  ) {
    return this.projectsService.getMetrics(organizationId, entityId);
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getProjectById(
    @CurrentTenant('id') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.projectsService.getProjectById(id, organizationId);
  }

  @Post()
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async createProject(
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateProjectDto,
  ) {
    return this.projectsService.createProject(organizationId, dto, userId);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async updateProject(
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.updateProject(id, organizationId, dto, userId);
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  @HttpCode(HttpStatus.OK)
  async deleteProject(
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.projectsService.deleteProject(id, organizationId, userId);
  }
}
