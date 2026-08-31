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
} from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';
import { JournalFilterDto } from './dto/journal-filter.dto';
import { LedgerFilterDto, TrialBalanceFilterDto } from './dto/ledger-filter.dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('api/v1/accounting')
@UseGuards(SessionAuthGuard, TenantGuard, RolesGuard)
export class AccountingController {
  constructor(private accountingService: AccountingService) {}

  // ==========================================
  // CHART OF ACCOUNTS ENDPOINTS
  // ==========================================

  @Get('accounts')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getAccounts(
    @CurrentTenant('id') organizationId: string,
    @Query('entityId') entityId?: string,
  ) {
    return this.accountingService.getAccounts(organizationId, entityId);
  }

  @Get('accounts/:id')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getAccountById(
    @Param('id') id: string,
    @CurrentTenant('id') organizationId: string,
  ) {
    return this.accountingService.getAccountById(id, organizationId);
  }

  @Post('accounts')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async createAccount(
    @Body() dto: CreateAccountDto,
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.accountingService.createAccount(dto, organizationId, userId);
  }

  @Patch('accounts/:id')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async updateAccount(
    @Param('id') id: string,
    @Body() dto: UpdateAccountDto,
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.accountingService.updateAccount(id, dto, organizationId, userId);
  }

  @Delete('accounts/:id')
  @Roles(Role.OWNER, Role.ADMIN)
  async deactivateAccount(
    @Param('id') id: string,
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.accountingService.deactivateAccount(id, organizationId, userId);
  }

  // ==========================================
  // JOURNAL ENTRIES ENDPOINTS
  // ==========================================

  @Get('journal-entries')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getJournalEntries(
    @CurrentTenant('id') organizationId: string,
    @Query() filter: JournalFilterDto,
  ) {
    return this.accountingService.getJournalEntries(organizationId, filter);
  }

  @Get('journal-entries/:id')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getJournalEntryById(
    @Param('id') id: string,
    @CurrentTenant('id') organizationId: string,
  ) {
    return this.accountingService.getJournalEntryById(id, organizationId);
  }

  @Post('journal-entries')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async createJournalEntry(
    @Body() dto: CreateJournalEntryDto,
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.accountingService.createJournalEntry(dto, organizationId, userId);
  }

  @Post('journal-entries/:id/post')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async postJournalEntry(
    @Param('id') id: string,
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.accountingService.postJournalEntry(id, organizationId, userId);
  }

  @Post('journal-entries/:id/void')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async voidJournalEntry(
    @Param('id') id: string,
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.accountingService.voidJournalEntry(id, organizationId, userId);
  }

  // ==========================================
  // GENERAL LEDGER & TRIAL BALANCE ENDPOINTS
  // ==========================================

  @Get('ledger')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getGeneralLedger(
    @CurrentTenant('id') organizationId: string,
    @Query() filter: LedgerFilterDto,
  ) {
    return this.accountingService.getGeneralLedger(organizationId, filter);
  }

  @Get('trial-balance')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getTrialBalance(
    @CurrentTenant('id') organizationId: string,
    @Query() filter: TrialBalanceFilterDto,
  ) {
    return this.accountingService.getTrialBalance(organizationId, filter);
  }
}
