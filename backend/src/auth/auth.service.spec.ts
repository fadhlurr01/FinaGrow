import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

describe('AuthService (Phase 1)', () => {
  let service: AuthService;
  let prisma: any;
  let auditService: any;

  const mockUser = {
    id: 'user-uuid-1',
    email: 'test@finagrow.com',
    passwordHash: '',
    fullName: 'Test User',
    isActive: true,
    memberships: [
      {
        id: 'member-1',
        organizationId: 'org-uuid-1',
        userId: 'user-uuid-1',
        role: 'OWNER',
        organization: {
          id: 'org-uuid-1',
          name: 'Test Org',
          slug: 'test-org-1234',
        },
      },
    ],
  };

  beforeAll(async () => {
    mockUser.passwordHash = await bcrypt.hash('secret123', 10);
  });

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      organization: {
        create: jest.fn(),
      },
      organizationMember: {
        create: jest.fn(),
      },
      entity: {
        create: jest.fn(),
      },
      session: {
        create: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    auditService = {
      log: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should successfully register a new user, create org, default entity and session', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'new-user-id',
        email: 'new@finagrow.com',
        fullName: 'New Owner',
        isActive: true,
      });
      prisma.organization.create.mockResolvedValue({
        id: 'new-org-id',
        name: 'New Corp',
        slug: 'new-corp-1234',
      });
      prisma.organizationMember.create.mockResolvedValue({
        id: 'new-member-id',
        organizationId: 'new-org-id',
        userId: 'new-user-id',
        role: 'OWNER',
      });
      prisma.entity.create.mockResolvedValue({
        id: 'new-entity-id',
        name: 'New Corp (HQ)',
        code: 'HQ-01',
      });
      prisma.session.create.mockResolvedValue({
        id: 'session-id',
      });

      const result = await service.register({
        email: 'new@finagrow.com',
        password: 'password123',
        fullName: 'New Owner',
        organizationName: 'New Corp',
      });

      expect(result.user.email).toBe('new@finagrow.com');
      expect(result.organization.name).toBe('New Corp');
      expect(result.role).toBe('OWNER');
      expect(result.sessionToken).toBeDefined();
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'USER_REGISTERED' }),
      );
    });

    it('should throw ConflictException if email is already registered', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.register({
          email: 'test@finagrow.com',
          password: 'password123',
          fullName: 'Test User',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should successfully authenticate user with valid credentials', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.session.create.mockResolvedValue({ id: 'new-session' });

      const result = await service.login({
        email: 'test@finagrow.com',
        password: 'secret123',
      });

      expect(result.user.email).toBe(mockUser.email);
      expect(result.sessionToken).toBeDefined();
      expect(result.activeRole).toBe('OWNER');
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'USER_LOGIN' }),
      );
    });

    it('should throw UnauthorizedException for incorrect password', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.login({
          email: 'test@finagrow.com',
          password: 'wrong-password',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'nonexistent@finagrow.com',
          password: 'secret123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should delete active session and log audit event', async () => {
      prisma.session.delete.mockResolvedValue({ id: 'session-id' });

      const result = await service.logout('session-id', 'user-id', 'org-id');
      expect(result.message).toBe('Logged out successfully.');
      expect(prisma.session.delete).toHaveBeenCalledWith({ where: { id: 'session-id' } });
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'USER_LOGOUT' }),
      );
    });
  });
});
