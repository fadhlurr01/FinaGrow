import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EntitiesService } from './entities.service';
import { CreateEntityDto } from './dto/create-entity.dto';
import { UpdateEntityDto } from './dto/update-entity.dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('api/v1/entities')
@UseGuards(SessionAuthGuard, TenantGuard, RolesGuard)
export class EntitiesController {
  constructor(private entitiesService: EntitiesService) {}

  @Get()
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getEntities(@CurrentTenant('id') organizationId: string) {
    return this.entitiesService.getEntitiesByOrganization(organizationId);
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getEntityById(
    @CurrentTenant('id') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.entitiesService.getEntityById(id, organizationId);
  }

  @Post()
  @Roles(Role.OWNER, Role.ADMIN)
  async createEntity(
    @Body() dto: CreateEntityDto,
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.entitiesService.createEntity(dto, organizationId, userId);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  async updateEntity(
    @Param('id') id: string,
    @Body() dto: UpdateEntityDto,
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.entitiesService.updateEntity(id, organizationId, dto, userId);
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async deleteEntity(
    @Param('id') id: string,
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.entitiesService.deleteEntity(id, organizationId, userId);
  }
}
