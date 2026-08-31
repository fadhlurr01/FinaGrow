import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto, PaymentFilterDto } from './dto/create-payment.dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('api/v1/payments')
@UseGuards(SessionAuthGuard, TenantGuard, RolesGuard)
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Get()
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getPayments(
    @CurrentTenant('id') organizationId: string,
    @Query() filter: PaymentFilterDto,
  ) {
    return this.paymentsService.getPayments(organizationId, filter);
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getPaymentById(
    @Param('id') id: string,
    @CurrentTenant('id') organizationId: string,
  ) {
    return this.paymentsService.getPaymentById(id, organizationId);
  }

  @Post()
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async createPayment(
    @Body() dto: CreatePaymentDto,
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.paymentsService.createPayment(dto, organizationId, userId);
  }

  @Post(':id/post')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async postPayment(
    @Param('id') id: string,
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.paymentsService.postPayment(id, organizationId, userId);
  }

  @Post(':id/reverse')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async reversePayment(
    @Param('id') id: string,
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.paymentsService.reversePayment(id, organizationId, userId);
  }
}
