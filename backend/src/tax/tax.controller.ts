// ===================================================================
// Phase 8 — TaxController
// REST API for Tax Engine: codes, rules, transactions, periods,
// payments, reconciliation.
// ===================================================================
import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role, TaxType } from '@prisma/client';
import { TaxEngineService } from './tax-engine.service';
import { TaxTransactionService } from './tax-transaction.service';
import { TaxPeriodService } from './tax-period.service';
import { TaxPaymentService } from './tax-payment.service';
import { TaxReconciliationService } from './tax-reconciliation.service';
import { Decimal } from '@prisma/client/runtime/library';
import {
  CreateTaxCodeDto,
  UpdateTaxCodeDto,
  CreateTaxRuleDto,
  TaxCalculationRequestDto,
  TaxTransactionFilterDto,
  GetOrCreateTaxPeriodDto,
  TaxPeriodFilterDto,
  ReopenTaxPeriodDto,
  CreateTaxPaymentDto,
  TaxPaymentFilterDto,
} from './dto/tax.dto';

@Controller('api/v1/tax')
@UseGuards(SessionAuthGuard, TenantGuard, RolesGuard)
export class TaxController {
  constructor(
    private taxEngine: TaxEngineService,
    private taxTransaction: TaxTransactionService,
    private taxPeriod: TaxPeriodService,
    private taxPayment: TaxPaymentService,
    private taxReconciliation: TaxReconciliationService,
  ) {}

  // ─────────────────────────────────────────────────────────────────
  // TAX CODES
  // ─────────────────────────────────────────────────────────────────

  @Get('codes')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getTaxCodes(
    @CurrentTenant('id') organizationId: string,
    @Query('entityId') entityId?: string,
  ) {
    return this.taxEngine.getTaxCodes(organizationId, entityId);
  }

  @Get('codes/:id')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getTaxCode(
    @CurrentTenant('id') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.taxEngine.getTaxCode(id, organizationId);
  }

  @Post('codes')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async createTaxCode(
    @CurrentTenant('id') organizationId: string,
    @Body() dto: CreateTaxCodeDto,
  ) {
    return this.taxEngine.createTaxCode(organizationId, dto);
  }

  @Put('codes/:id')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async updateTaxCode(
    @CurrentTenant('id') organizationId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTaxCodeDto,
  ) {
    return this.taxEngine.updateTaxCode(id, organizationId, dto);
  }

  // ─────────────────────────────────────────────────────────────────
  // TAX RULES
  // ─────────────────────────────────────────────────────────────────

  @Post('rules')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async createTaxRule(
    @CurrentTenant('id') organizationId: string,
    @Body() dto: CreateTaxRuleDto,
  ) {
    return this.taxEngine.createTaxRule(organizationId, dto);
  }

  // ─────────────────────────────────────────────────────────────────
  // TAX CALCULATION PREVIEW
  // ─────────────────────────────────────────────────────────────────

  @Post('calculate')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.VIEWER)
  async calculateTax(
    @CurrentTenant('id') organizationId: string,
    @Body() dto: TaxCalculationRequestDto,
  ) {
    const result = await this.taxEngine.calculateTax(
      dto.taxCodeId,
      new Date(dto.transactionDate),
      new Decimal(dto.baseAmount),
      organizationId,
    );
    // Serialize Decimal to string for JSON
    return {
      ...result,
      legalRate: result.legalRate.toString(),
      dppFactor: result.dppFactor.toString(),
      baseAmount: result.baseAmount.toString(),
      dppAmount: result.dppAmount.toString(),
      taxAmount: result.taxAmount.toString(),
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // TAX TRANSACTIONS
  // ─────────────────────────────────────────────────────────────────

  @Get('transactions')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getTransactions(
    @CurrentTenant('id') organizationId: string,
    @Query() filter: TaxTransactionFilterDto,
  ) {
    return this.taxTransaction.getTransactions(organizationId, filter);
  }

  @Post('transactions/:id/post')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  @HttpCode(HttpStatus.OK)
  async postTransaction(
    @CurrentTenant('id') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.taxTransaction.postTaxTransaction(id, organizationId);
  }

  @Post('transactions/:id/reverse')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  @HttpCode(HttpStatus.OK)
  async reverseTransaction(
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('entityId') userEntityId: string,
    @Param('id') id: string,
    @Body('notes') notes?: string,
  ) {
    return this.taxTransaction.reverseTaxTransaction(
      id,
      organizationId,
      userEntityId,
      notes,
    );
  }

  @Get('summary/vat')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getVATSummary(
    @CurrentTenant('id') organizationId: string,
    @Query('entityId') entityId: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.taxTransaction.getVATSummary(
      organizationId,
      entityId,
      parseInt(year),
      parseInt(month),
    );
  }

  @Get('summary/withholding')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getWithholdingSummary(
    @CurrentTenant('id') organizationId: string,
    @Query('entityId') entityId: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.taxTransaction.getWithholdingSummary(
      organizationId,
      entityId,
      parseInt(year),
      parseInt(month),
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // TAX PERIODS
  // ─────────────────────────────────────────────────────────────────

  @Get('periods')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getPeriods(
    @CurrentTenant('id') organizationId: string,
    @Query() filter: TaxPeriodFilterDto,
  ) {
    return this.taxPeriod.getPeriods(organizationId, filter);
  }

  @Post('periods')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async getOrCreatePeriod(
    @CurrentTenant('id') organizationId: string,
    @Body() dto: GetOrCreateTaxPeriodDto,
  ) {
    return this.taxPeriod.getOrCreatePeriod(
      organizationId,
      dto.entityId,
      dto.taxType as TaxType,
      dto.periodYear,
      dto.periodMonth,
    );
  }

  @Post('periods/:id/prepare')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  @HttpCode(HttpStatus.OK)
  async preparePeriod(
    @CurrentTenant('id') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.taxPeriod.preparePeriod(id, organizationId);
  }

  @Post('periods/:id/file')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  @HttpCode(HttpStatus.OK)
  async filePeriod(
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.taxPeriod.filePeriod(id, organizationId, userId);
  }

  @Post('periods/:id/reopen')
  @Roles(Role.OWNER, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async reopenPeriod(
    @CurrentTenant('id') organizationId: string,
    @Param('id') id: string,
    @Body() dto: ReopenTaxPeriodDto,
  ) {
    return this.taxPeriod.reopenPeriod(id, organizationId, dto.reason);
  }

  // ─────────────────────────────────────────────────────────────────
  // TAX PAYMENTS
  // ─────────────────────────────────────────────────────────────────

  @Get('payments')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getTaxPayments(
    @CurrentTenant('id') organizationId: string,
    @Query() filter: TaxPaymentFilterDto,
  ) {
    return this.taxPayment.getTaxPayments(organizationId, filter);
  }

  @Post('payments')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async createTaxPayment(
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTaxPaymentDto,
  ) {
    return this.taxPayment.createTaxPayment(organizationId, dto, userId);
  }

  @Post('payments/:id/post-vat')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  @HttpCode(HttpStatus.OK)
  async postVATSettlement(
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.taxPayment.postVATSettlement(id, organizationId, userId);
  }

  @Post('payments/:id/post-withholding')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  @HttpCode(HttpStatus.OK)
  async postWithholdingRemittance(
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.taxPayment.postWithholdingRemittance(id, organizationId, userId);
  }

  // ─────────────────────────────────────────────────────────────────
  // RECONCILIATION
  // ─────────────────────────────────────────────────────────────────

  @Get('reconciliation')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async reconcile(
    @CurrentTenant('id') organizationId: string,
    @Query('entityId') entityId: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.taxReconciliation.reconcile(
      organizationId,
      entityId,
      parseInt(year),
      parseInt(month),
    );
  }
}
