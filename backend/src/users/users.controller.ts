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
import { UsersService } from './users.service';
import { InviteUserDto, UpdateUserRoleDto, UpdateProfileDto, UpdateSettingsDto } from './dto/user.dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('api/v1')
@UseGuards(SessionAuthGuard, TenantGuard, RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  // ─── USERS MANAGEMENT ───

  @Get('users')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getUsers(@CurrentTenant('id') organizationId: string) {
    return this.usersService.getUsersByOrganization(organizationId);
  }

  @Post('users')
  @Roles(Role.OWNER, Role.ADMIN)
  async createUser(
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: InviteUserDto,
  ) {
    return this.usersService.createUserOrInvite(organizationId, dto, userId);
  }

  @Patch('users/:id/role')
  @Roles(Role.OWNER, Role.ADMIN)
  async updateUserRole(
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
    @Param('id') targetUserId: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.usersService.updateUserRole(organizationId, targetUserId, dto, userId);
  }

  @Delete('users/:id')
  @Roles(Role.OWNER, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async deleteUser(
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
    @Param('id') targetUserId: string,
  ) {
    return this.usersService.deactivateOrRemoveUser(organizationId, targetUserId, userId);
  }

  // ─── USER PROFILE ───

  @Get('profile')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getProfile(
    @CurrentUser('id') userId: string,
    @CurrentTenant('id') organizationId: string,
  ) {
    return this.usersService.getProfile(userId, organizationId);
  }

  @Patch('profile')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  // ─── SETTINGS ───

  @Get('settings')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getSettings(
    @CurrentUser('id') userId: string,
    @CurrentTenant('id') organizationId: string,
  ) {
    return this.usersService.getSettings(userId, organizationId);
  }

  @Patch('settings')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async updateSettings(
    @CurrentUser('id') userId: string,
    @CurrentTenant('id') organizationId: string,
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.usersService.updateSettings(userId, organizationId, dto);
  }
}
