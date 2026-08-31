import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CashBankService } from './cash-bank.service';
import { PaymentsService } from './payments.service';
import { StatementsService } from './statements.service';
import { ReconciliationService } from './reconciliation.service';
import { CreateCashBankAccountDto, UpdateCashBankAccountDto } from './dto/create-account.dto';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { ImportStatementDto } from './dto/import-statement.dto';
import {
  CreateReconciliationDto,
  MatchStatementLineDto,
  UnmatchStatementLineDto,
} from './dto/reconciliation.dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('api/v1/cash-bank')
@UseGuards(SessionAuthGuard, TenantGuard, RolesGuard)
export class CashBankController {
  constructor(
    private cashBankService: CashBankService,
    private paymentsService: PaymentsService,
    private statementsService: StatementsService,
    private reconciliationService: ReconciliationService,
  ) {}

  // ==========================================
  // CASH & BANK ACCOUNT ENDPOINTS
  // ==========================================

  @Get('accounts')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getAccounts(
    @CurrentTenant('id') organizationId: string,
    @Query('entityId') entityId?: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    const isActive = activeOnly !== undefined ? activeOnly === 'true' : undefined;
    return this.cashBankService.getAccounts(organizationId, entityId, isActive);
  }

  @Get('accounts/:id')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getAccountById(
    @Param('id') id: string,
    @CurrentTenant('id') organizationId: string,
  ) {
    return this.cashBankService.getAccountById(id, organizationId);
  }

  @Post('accounts')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async createAccount(
    @Body() dto: CreateCashBankAccountDto,
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.cashBankService.createAccount(dto, organizationId, userId);
  }

  @Patch('accounts/:id')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async updateAccount(
    @Param('id') id: string,
    @Body() dto: UpdateCashBankAccountDto,
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.cashBankService.updateAccount(id, dto, organizationId, userId);
  }

  @Post('accounts/:id/deactivate')
  @Roles(Role.OWNER, Role.ADMIN)
  async deactivateAccount(
    @Param('id') id: string,
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.cashBankService.deactivateAccount(id, organizationId, userId);
  }

  @Get('accounts/:id/balance')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getAccountBalance(
    @Param('id') id: string,
    @CurrentTenant('id') organizationId: string,
  ) {
    return this.cashBankService.getAccountBalance(id, organizationId);
  }

  // ==========================================
  // TRANSFERS ENDPOINT
  // ==========================================

  @Post('transfers')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async createTransfer(
    @Body() dto: CreateTransferDto,
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.paymentsService.createTransfer(dto, organizationId, userId);
  }

  // ==========================================
  // BANK STATEMENT IMPORT ENDPOINTS
  // ==========================================

  @Post('statements/import')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async importStatement(
    @Body() dto: ImportStatementDto,
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.statementsService.importCsvStatement(dto, organizationId, userId);
  }

  @Get('statements')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getStatements(
    @CurrentTenant('id') organizationId: string,
    @Query('entityId') entityId?: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.statementsService.getImports(organizationId, entityId, accountId);
  }

  @Get('statements/:id')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getStatementById(
    @Param('id') id: string,
    @CurrentTenant('id') organizationId: string,
  ) {
    return this.statementsService.getImportById(id, organizationId);
  }

  // ==========================================
  // BANK RECONCILIATION ENDPOINTS
  // ==========================================

  @Get('reconciliation')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getReconciliations(
    @CurrentTenant('id') organizationId: string,
    @Query('entityId') entityId?: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.reconciliationService.getReconciliations(organizationId, entityId, accountId);
  }

  @Post('reconciliation')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async createReconciliation(
    @Body() dto: CreateReconciliationDto,
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.reconciliationService.createReconciliation(dto, organizationId, userId);
  }

  @Get('reconciliation/:id')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getReconciliationById(
    @Param('id') id: string,
    @CurrentTenant('id') organizationId: string,
  ) {
    return this.reconciliationService.getReconciliationById(id, organizationId);
  }

  @Get('reconciliation/:id/suggestions')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR)
  async getMatchSuggestions(
    @Param('id') id: string,
    @CurrentTenant('id') organizationId: string,
  ) {
    return this.reconciliationService.getMatchSuggestions(id, organizationId);
  }

  @Post('reconciliation/:id/match')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async matchStatementLine(
    @Body() dto: MatchStatementLineDto,
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.reconciliationService.matchStatementLine(dto, organizationId, userId);
  }

  @Post('reconciliation/:id/unmatch')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async unmatchStatementLine(
    @Body() dto: UnmatchStatementLineDto,
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.reconciliationService.unmatchStatementLine(dto, organizationId, userId);
  }

  @Post('reconciliation/:id/complete')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async completeReconciliation(
    @Param('id') id: string,
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.reconciliationService.completeReconciliation(id, organizationId, userId);
  }

  @Post('reconciliation/:id/reopen')
  @Roles(Role.OWNER, Role.ADMIN)
  async reopenReconciliation(
    @Param('id') id: string,
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.reconciliationService.reopenReconciliation(id, organizationId, userId);
  }
}
