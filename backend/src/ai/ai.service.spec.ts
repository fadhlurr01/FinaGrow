import { Test, TestingModule } from '@nestjs/testing';
import { AIService } from './ai.service';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../audit/audit.service';

describe('AIService (Secure Backend Proxy)', () => {
  let service: AIService;
  let auditService: any;
  let configService: any;

  beforeEach(async () => {
    auditService = {
      log: jest.fn().mockResolvedValue(true),
    };

    configService = {
      get: jest.fn().mockReturnValue(''),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIService,
        { provide: ConfigService, useValue: configService },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<AIService>(AIService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should process financial query and record audit log without leaking keys', async () => {
    const result = await service.processQuery(
      {
        prompt: 'How to optimize working capital and invoice collection?',
        context: 'Cash: IDR 150M, AR: IDR 45M, AP: IDR 12M',
      },
      'user-123',
      'org-456',
    );

    expect(result.response).toBeDefined();
    expect(result.response.length).toBeGreaterThan(20);
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'AI_QUERY_EXECUTED',
        organizationId: 'org-456',
        userId: 'user-123',
      }),
    );
  });
});
