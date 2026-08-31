import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { InviteUserDto, UpdateUserRoleDto, UpdateProfileDto, UpdateSettingsDto } from './dto/user.dto';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
        userSettings: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
        userSettings: true,
      },
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // ORGANIZATION USERS MANAGEMENT
  // ──────────────────────────────────────────────────────────────────

  async getUsersByOrganization(organizationId: string) {
    const members = await this.prisma.organizationMember.findMany({
      where: { organizationId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            avatarUrl: true,
            phone: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return members.map((m) => ({
      id: m.user.id,
      membershipId: m.id,
      name: m.user.fullName,
      email: m.user.email,
      phone: m.user.phone,
      avatarUrl: m.user.avatarUrl,
      role: m.role,
      status: m.user.isActive ? 'Active' : 'Suspended',
      joinedAt: m.createdAt,
    }));
  }

  async createUserOrInvite(organizationId: string, dto: InviteUserDto, inviterId: string) {
    const email = dto.email.trim().toLowerCase();

    let user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      // Check if already a member
      const existingMember = await this.prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId,
            userId: user.id,
          },
        },
      });

      if (existingMember) {
        throw new ConflictException('User is already a member of this organization.');
      }
    } else {
      // Create new user account with default or specified password
      const initialPassword = dto.password || 'Finagrow@2026';
      const passwordHash = await bcrypt.hash(initialPassword, 10);

      user = await this.prisma.user.create({
        data: {
          email,
          fullName: dto.fullName.trim(),
          passwordHash,
          isActive: true,
        },
      });
    }

    const membership = await this.prisma.organizationMember.create({
      data: {
        organizationId,
        userId: user.id,
        role: dto.role,
      },
    });

    await this.auditService.log({
      organizationId,
      userId: inviterId,
      action: 'USER_INVITED_TO_ORG',
      resourceType: 'OrganizationMember',
      resourceId: membership.id,
      metadata: { email, role: dto.role },
    });

    return {
      id: user.id,
      membershipId: membership.id,
      name: user.fullName,
      email: user.email,
      role: membership.role,
      status: user.isActive ? 'Active' : 'Suspended',
      joinedAt: membership.createdAt,
    };
  }

  async updateUserRole(organizationId: string, targetUserId: string, dto: UpdateUserRoleDto, currentUserId: string) {
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: targetUserId,
        },
      },
    });

    if (!membership) throw new NotFoundException('Member not found in this organization');

    const updated = await this.prisma.organizationMember.update({
      where: { id: membership.id },
      data: { role: dto.role },
      include: { user: true },
    });

    await this.auditService.log({
      organizationId,
      userId: currentUserId,
      action: 'USER_ROLE_UPDATED',
      resourceType: 'OrganizationMember',
      resourceId: membership.id,
      metadata: { targetUserId, newRole: dto.role },
    });

    return {
      id: updated.user.id,
      membershipId: updated.id,
      name: updated.user.fullName,
      email: updated.user.email,
      role: updated.role,
      status: updated.user.isActive ? 'Active' : 'Suspended',
    };
  }

  async deactivateOrRemoveUser(organizationId: string, targetUserId: string, currentUserId: string) {
    if (targetUserId === currentUserId) {
      throw new BadRequestException('You cannot remove yourself from the organization.');
    }

    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: targetUserId,
        },
      },
    });

    if (!membership) throw new NotFoundException('Member not found in this organization');

    await this.prisma.organizationMember.delete({
      where: { id: membership.id },
    });

    await this.auditService.log({
      organizationId,
      userId: currentUserId,
      action: 'USER_REMOVED_FROM_ORG',
      resourceType: 'OrganizationMember',
      resourceId: membership.id,
      metadata: { targetUserId },
    });

    return { success: true, message: 'User removed from organization successfully.' };
  }

  // ──────────────────────────────────────────────────────────────────
  // USER PROFILE
  // ──────────────────────────────────────────────────────────────────

  async getProfile(userId: string, organizationId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          where: { organizationId },
          include: { organization: true },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const member = user.memberships[0];

    return {
      id: user.id,
      name: user.fullName,
      email: user.email,
      phone: user.phone || '',
      avatarUrl: user.avatarUrl || '',
      role: member?.role || 'VIEWER',
      organizationName: member?.organization?.name || '',
      createdAt: user.createdAt,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException('User not found');

    const data: any = {};
    if (dto.fullName !== undefined) data.fullName = dto.fullName.trim();
    if (dto.phone !== undefined) data.phone = dto.phone.trim();
    if (dto.avatarUrl !== undefined) data.avatarUrl = dto.avatarUrl;

    if (dto.newPassword) {
      if (!dto.currentPassword) {
        throw new BadRequestException('Current password is required to set a new password.');
      }
      const match = await bcrypt.compare(dto.currentPassword, user.passwordHash);
      if (!match) {
        throw new BadRequestException('Current password does not match.');
      }
      data.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
    });

    const { passwordHash, ...sanitized } = updated;
    return sanitized;
  }

  // ──────────────────────────────────────────────────────────────────
  // SETTINGS
  // ──────────────────────────────────────────────────────────────────

  async getSettings(userId: string, organizationId: string) {
    const [userSettings, org] = await Promise.all([
      this.prisma.userSettings.findUnique({
        where: { userId },
      }),
      this.prisma.organization.findUnique({
        where: { id: organizationId },
      }),
    ]);

    return {
      language: userSettings?.language || 'id',
      theme: userSettings?.theme || 'light',
      timezone: userSettings?.timezone || org?.timezone || 'Asia/Jakarta',
      baseCurrency: org?.baseCurrency || 'IDR',
      enabledModules: userSettings?.enabledModules || {
        dashboard: true,
        transactions: true,
        invoices: true,
        cashbank: true,
        budgeting: true,
        tax: true,
        assets: true,
        inventory: true,
        coa: true,
        entities: true,
        users: true,
        settings: true,
      },
    };
  }

  async updateSettings(userId: string, organizationId: string, dto: UpdateSettingsDto) {
    const data: any = {};
    if (dto.language !== undefined) data.language = dto.language;
    if (dto.theme !== undefined) data.theme = dto.theme;
    if (dto.timezone !== undefined) data.timezone = dto.timezone;
    if (dto.enabledModules !== undefined) data.enabledModules = dto.enabledModules;

    const settings = await this.prisma.userSettings.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        language: dto.language || 'id',
        theme: dto.theme || 'light',
        timezone: dto.timezone || 'Asia/Jakarta',
        enabledModules: dto.enabledModules || undefined,
      },
    });

    return settings;
  }
}
