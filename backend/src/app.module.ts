import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './audit/audit.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { EntitiesModule } from './entities/entities.module';
import { AccountingModule } from './accounting/accounting.module';
import { SalesModule } from './sales/sales.module';
import { PurchasesModule } from './purchases/purchases.module';
import { CashBankModule } from './cash-bank/cash-bank.module';
import { InventoryModule } from './inventory/inventory.module';
import { AssetsModule } from './assets/assets.module';
import { AIModule } from './ai/ai.module';
import { TaxModule } from './tax/tax.module';
import { BudgetsModule } from './budgets/budgets.module';
import { ProjectsModule } from './projects/projects.module';
import { PayrollModule } from './payroll/payroll.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ReportsModule } from './reports/reports.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    PrismaModule,
    AuditModule,
    UsersModule,
    AuthModule,
    OrganizationsModule,
    EntitiesModule,
    AccountingModule,
    SalesModule,
    PurchasesModule,
    CashBankModule,
    InventoryModule,
    AssetsModule,
    AIModule,
    TaxModule,
    BudgetsModule,
    ProjectsModule,
    PayrollModule,
    SubscriptionsModule,
    DashboardModule,
    ReportsModule,
    HealthModule,
  ],
})
export class AppModule {}
