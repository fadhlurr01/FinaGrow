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
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto, UpdateBudgetDto, BudgetFilterDto } from './dto/budget.dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('api/v1/budgets')
@UseGuards(SessionAuthGuard, TenantGuard, RolesGuard)
export class BudgetsController {
  constructor(private budgetsService: BudgetsService) {}

  @Get()
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getBudgets(
    @CurrentTenant('id') organizationId: string,
    @Query() filter: BudgetFilterDto,
  ) {
    return this.budgetsService.getBudgets(organizationId, filter);
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getBudgetById(
    @CurrentTenant('id') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.budgetsService.getBudgetById(id, organizationId);
  }

  @Post()
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async createBudget(
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateBudgetDto,
  ) {
    return this.budgetsService.createBudget(organizationId, dto, userId);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async updateBudget(
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateBudgetDto,
  ) {
    return this.budgetsService.updateBudget(id, organizationId, dto, userId);
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  @HttpCode(HttpStatus.OK)
  async deleteBudget(
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.budgetsService.deleteBudget(id, organizationId, userId);
  }
}
