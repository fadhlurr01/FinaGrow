import {
  PrismaClient,
  Role,
  AccountType,
  AccountSubtype,
  NormalBalance,
  JournalEntryStatus,
  CashBankAccountType,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting FINAGROW Phase 5 database seed...');

  // 1. Create Default Master Organization (Multi-tenant Foundation)
  const organization = await prisma.organization.upsert({
    where: { slug: 'berkah-cahaya-group' },
    update: {},
    create: {
      name: 'Berkah Cahaya Group Corp',
      slug: 'berkah-cahaya-group',
      baseCurrency: 'IDR',
      timezone: 'Asia/Jakarta',
    },
  });

  console.log(`Verified Organization: ${organization.name} (${organization.id})`);

  // Explicitly seed PRO subscription for Demo Organization
  await prisma.subscription.upsert({
    where: { organizationId: organization.id },
    update: {
      planCode: 'PRO',
      status: 'ACTIVE',
    },
    create: {
      organizationId: organization.id,
      planCode: 'PRO',
      status: 'ACTIVE',
    },
  });

  // 2. Create Initial Administrator & Demo Users
  const passwordHash = await bcrypt.hash('123456', 10);
  
  const ownerUser = await prisma.user.upsert({
    where: { email: 'admin@finagrow.com' },
    update: {
      passwordHash,
      fullName: 'Chief Financial Officer & Executive Admin',
    },
    create: {
      email: 'admin@finagrow.com',
      passwordHash,
      fullName: 'Chief Financial Officer & Executive Admin',
      isActive: true,
    },
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: ownerUser.id,
      },
    },
    update: {
      role: Role.OWNER,
    },
    create: {
      organizationId: organization.id,
      userId: ownerUser.id,
      role: Role.OWNER,
    },
  });

  // Demo Admin User (matches UI quick-login button)
  const demoAdminUser = await prisma.user.upsert({
    where: { email: 'demo_admin@fms.com' },
    update: {
      passwordHash,
      fullName: 'Demo Admin',
    },
    create: {
      email: 'demo_admin@fms.com',
      passwordHash,
      fullName: 'Demo Admin',
      isActive: true,
    },
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: demoAdminUser.id,
      },
    },
    update: {
      role: Role.ADMIN,
    },
    create: {
      organizationId: organization.id,
      userId: demoAdminUser.id,
      role: Role.ADMIN,
    },
  });

  // Demo Account User (matches Screenshot 2)
  const demoAccountUser = await prisma.user.upsert({
    where: { email: 'demo@fms.com' },
    update: {
      passwordHash,
      fullName: 'Demo Account',
    },
    create: {
      email: 'demo@fms.com',
      passwordHash,
      fullName: 'Demo Account',
      isActive: true,
    },
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: demoAccountUser.id,
      },
    },
    update: {
      role: Role.ADMIN,
    },
    create: {
      organizationId: organization.id,
      userId: demoAccountUser.id,
      role: Role.ADMIN,
    },
  });

  // Andi Wijaya (matches Screenshot 2)
  const andiUser = await prisma.user.upsert({
    where: { email: 'andi@bellcorp.com' },
    update: {
      passwordHash,
      fullName: 'Andi Wijaya',
    },
    create: {
      email: 'andi@bellcorp.com',
      passwordHash,
      fullName: 'Andi Wijaya',
      isActive: true,
    },
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: andiUser.id,
      },
    },
    update: {
      role: Role.ACCOUNTANT,
    },
    create: {
      organizationId: organization.id,
      userId: andiUser.id,
      role: Role.ACCOUNTANT,
    },
  });

  // Sari Indah (matches Screenshot 2)
  const sariUser = await prisma.user.upsert({
    where: { email: 'sari@bellcorp.com' },
    update: {
      passwordHash,
      fullName: 'Sari Indah',
    },
    create: {
      email: 'sari@bellcorp.com',
      passwordHash,
      fullName: 'Sari Indah',
      isActive: true,
    },
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: sariUser.id,
      },
    },
    update: {
      role: Role.ACCOUNTANT,
    },
    create: {
      organizationId: organization.id,
      userId: sariUser.id,
      role: Role.ACCOUNTANT,
    },
  });

  // Demo Standard User
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo_user@fms.com' },
    update: {
      passwordHash,
      fullName: 'Demo User',
    },
    create: {
      email: 'demo_user@fms.com',
      passwordHash,
      fullName: 'Demo User',
      isActive: true,
    },
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: demoUser.id,
      },
    },
    update: {
      role: Role.ACCOUNTANT,
    },
    create: {
      organizationId: organization.id,
      userId: demoUser.id,
      role: Role.ACCOUNTANT,
    },
  });

  console.log(`Verified 5 Demo Team Members matching Screenshot 2.`);

  // 3. Create Operating Entities (Matching Screenshot 1)
  const primaryEntity = await prisma.entity.upsert({
    where: {
      organizationId_code: {
        organizationId: organization.id,
        code: 'BC',
      },
    },
    update: {
      name: 'BellCorp Indonesia',
      legalName: 'PT BellCorp Indonesia Tbk',
      baseCurrency: 'IDR',
    },
    create: {
      organizationId: organization.id,
      code: 'BC',
      name: 'BellCorp Indonesia',
      legalName: 'PT BellCorp Indonesia Tbk',
      baseCurrency: 'IDR',
      country: 'ID',
    },
  });

  const secondEntity = await prisma.entity.upsert({
    where: {
      organizationId_code: {
        organizationId: organization.id,
        code: 'OB',
      },
    },
    update: {
      name: 'OptiBiz Global',
      legalName: 'OptiBiz Global Ltd',
      baseCurrency: 'USD',
    },
    create: {
      organizationId: organization.id,
      code: 'OB',
      name: 'OptiBiz Global',
      legalName: 'OptiBiz Global Ltd',
      baseCurrency: 'USD',
      country: 'US',
    },
  });

  console.log(`Verified 2 Business Entities: ${primaryEntity.name} (${primaryEntity.code}), ${secondEntity.name} (${secondEntity.code})`);

  // 4. Create Standard Starter Chart of Accounts (Matching Demo Exact Structure)
  const defaultAccounts = [
    // --- EXACT 15 CHART OF ACCOUNTS (SCREENSHOT 1) ---
    { code: '1001', name: 'Kas Kecil Cabang Jakarta', type: AccountType.ASSET, subtype: AccountSubtype.CASH_AND_EQUIVALENT, normalBalance: NormalBalance.DEBIT, description: 'Kas kecil operasional HO' },
    { code: '1002', name: 'Bank BCA Priority', type: AccountType.ASSET, subtype: AccountSubtype.CASH_AND_EQUIVALENT, normalBalance: NormalBalance.DEBIT, description: 'Rekening bank utama perusahaan' },
    { code: '1003', name: 'Bank Mandiri Corporate', type: AccountType.ASSET, subtype: AccountSubtype.CASH_AND_EQUIVALENT, normalBalance: NormalBalance.DEBIT, description: 'Rekening bank giro' },
    { code: '1100', name: 'Piutang Usaha Korporat', type: AccountType.ASSET, subtype: AccountSubtype.ACCOUNTS_RECEIVABLE, normalBalance: NormalBalance.DEBIT, description: 'Piutang institusi klien' },
    { code: '1140', name: 'Persediaan Barang Dagang', type: AccountType.ASSET, subtype: AccountSubtype.INVENTORY, normalBalance: NormalBalance.DEBIT, description: 'Perpetual inventory asset control' },
    { code: '1150', name: 'PPN Masukan (Input Tax)', type: AccountType.ASSET, subtype: AccountSubtype.CURRENT_ASSET, normalBalance: NormalBalance.DEBIT, description: 'Prepaid input value added tax' },
    { code: '1160', name: 'Uang Muka Pembelian', type: AccountType.ASSET, subtype: AccountSubtype.CURRENT_ASSET, normalBalance: NormalBalance.DEBIT, description: 'Prepaid vendor purchase advances' },
    { code: '1200', name: 'Persediaan Finished Goods', type: AccountType.ASSET, subtype: AccountSubtype.INVENTORY, normalBalance: NormalBalance.DEBIT, description: 'Persediaan barang utama' },
    { code: '1500', name: 'Aset Tetap Gedung Merdeka', type: AccountType.ASSET, subtype: AccountSubtype.FIXED_ASSET, normalBalance: NormalBalance.DEBIT, description: 'Gedung pencakar langit' },
    { code: '1510', name: 'Akumulasi Penyusutan Gedung & IT', type: AccountType.ASSET, subtype: AccountSubtype.ACCUMULATED_DEPRECIATION, normalBalance: NormalBalance.CREDIT, description: 'Accumulated depreciation' },
    { code: '1520', name: 'Aset Tetap Kendaraan', type: AccountType.ASSET, subtype: AccountSubtype.FIXED_ASSET, normalBalance: NormalBalance.DEBIT, description: 'Armada logistik' },
    { code: '1530', name: 'Akumulasi Penyusutan Kendaraan', type: AccountType.ASSET, subtype: AccountSubtype.ACCUMULATED_DEPRECIATION, normalBalance: NormalBalance.CREDIT, description: 'Accumulated depreciation' },
    { code: '1590', name: 'Aset Tetap Tanah', type: AccountType.ASSET, subtype: AccountSubtype.FIXED_ASSET, normalBalance: NormalBalance.DEBIT, description: 'Tanah properti hak milik' },

    // --- LIABILITIES ---
    { code: '2000', name: 'Utang Dagang Supplier', type: AccountType.LIABILITY, subtype: AccountSubtype.ACCOUNTS_PAYABLE, normalBalance: NormalBalance.CREDIT, description: 'Utang bahan baku' },
    { code: '2100', name: 'Utang PPN Masukan', type: AccountType.LIABILITY, subtype: AccountSubtype.TAX_PAYABLE, normalBalance: NormalBalance.CREDIT, description: 'PPN 11%' },
    { code: '2110', name: 'Utang PPh 21/23', type: AccountType.LIABILITY, subtype: AccountSubtype.TAX_PAYABLE, normalBalance: NormalBalance.CREDIT, description: 'Income tax withholding payable' },
    { code: '2140', name: 'Penerimaan Barang Belum Ditagih (GRNI)', type: AccountType.LIABILITY, subtype: AccountSubtype.CURRENT_LIABILITY, normalBalance: NormalBalance.CREDIT, description: 'GRNI clearing account' },
    { code: '2150', name: 'Pendapatan Diterima Dimuka', type: AccountType.LIABILITY, subtype: AccountSubtype.CURRENT_LIABILITY, normalBalance: NormalBalance.CREDIT, description: 'Customer advances' },

    // --- EQUITY ---
    { code: '3000', name: 'Modal Ventura Seri-A', type: AccountType.EQUITY, subtype: AccountSubtype.EQUITY, normalBalance: NormalBalance.CREDIT, description: 'Modal disetor investor' },
    { code: '3200', name: 'Laba Ditahan (Retained Earnings)', type: AccountType.EQUITY, subtype: AccountSubtype.RETAINED_EARNINGS, normalBalance: NormalBalance.CREDIT, description: 'Accumulated retained earnings' },

    // --- REVENUE ---
    { code: '4000', name: 'Pendapatan Kontrak Software', type: AccountType.REVENUE, subtype: AccountSubtype.OPERATING_REVENUE, normalBalance: NormalBalance.CREDIT, description: 'Pendapatan subscription enterprise' },
    { code: '4100', name: 'Pendapatan Lisensi API', type: AccountType.REVENUE, subtype: AccountSubtype.OPERATING_REVENUE, normalBalance: NormalBalance.CREDIT, description: 'Pendapatan integrasi API' },
    { code: '4800', name: 'Pendapatan Bunga Bank', type: AccountType.REVENUE, subtype: AccountSubtype.NON_OPERATING_REVENUE, normalBalance: NormalBalance.CREDIT, description: 'Bank interest income' },
    { code: '4900', name: 'Keuntungan Penyesuaian Persediaan', type: AccountType.REVENUE, subtype: AccountSubtype.NON_OPERATING_REVENUE, normalBalance: NormalBalance.CREDIT, description: 'Inventory gain' },
    { code: '4910', name: 'Keuntungan Pelepasan Aset', type: AccountType.REVENUE, subtype: AccountSubtype.NON_OPERATING_REVENUE, normalBalance: NormalBalance.CREDIT, description: 'Gain on disposal' },

    // --- EXPENSES ---
    { code: '5000', name: 'HPP Layanan Cloud', type: AccountType.EXPENSE, subtype: AccountSubtype.COST_OF_GOODS_SOLD, normalBalance: NormalBalance.DEBIT, description: 'Biaya server AWS/Google Cloud' },
    { code: '5100', name: 'Beban Gaji Direksi & Staf', type: AccountType.EXPENSE, subtype: AccountSubtype.PAYROLL_EXPENSE, normalBalance: NormalBalance.DEBIT, description: 'Beban kompensasi tim' },
    { code: '5200', name: 'Beban Sewa Data Center', type: AccountType.EXPENSE, subtype: AccountSubtype.OPERATING_EXPENSE, normalBalance: NormalBalance.DEBIT, description: 'Sewa fasilitas rack' },
    { code: '5300', name: 'Beban Marketing Campaign', type: AccountType.EXPENSE, subtype: AccountSubtype.OPERATING_EXPENSE, normalBalance: NormalBalance.DEBIT, description: 'Ads & PR outreach' },
    { code: '5800', name: 'Beban Penyesuaian Persediaan', type: AccountType.EXPENSE, subtype: AccountSubtype.OTHER_EXPENSE, normalBalance: NormalBalance.DEBIT, description: 'Inventory loss' },
    { code: '5910', name: 'Kerugian Pelepasan Aset', type: AccountType.EXPENSE, subtype: AccountSubtype.OTHER_EXPENSE, normalBalance: NormalBalance.DEBIT, description: 'Loss on disposal' },
    { code: '6000', name: 'Beban Operasional Umum', type: AccountType.EXPENSE, subtype: AccountSubtype.OPERATING_EXPENSE, normalBalance: NormalBalance.DEBIT, description: 'General operational expenses' },
    { code: '6100', name: 'Beban Sewa Kantor', type: AccountType.EXPENSE, subtype: AccountSubtype.OPERATING_EXPENSE, normalBalance: NormalBalance.DEBIT, description: 'Office lease expense' },
    { code: '6500', name: 'Beban Penyusutan Aset', type: AccountType.EXPENSE, subtype: AccountSubtype.DEPRECIATION_EXPENSE, normalBalance: NormalBalance.DEBIT, description: 'Depreciation expense' },
    { code: '6800', name: 'Beban Administrasi Bank', type: AccountType.EXPENSE, subtype: AccountSubtype.NON_OPERATING_EXPENSE, normalBalance: NormalBalance.DEBIT, description: 'Bank fee charges' },
  ];

  const createdAccountMap: Record<string, string> = {};

  for (const acc of defaultAccounts) {
    const record = await prisma.account.upsert({
      where: {
        entityId_code: {
          entityId: primaryEntity.id,
          code: acc.code,
        },
      },
      update: {
        name: acc.name,
        type: acc.type,
        subtype: acc.subtype,
        description: acc.description,
      },
      create: {
        organizationId: organization.id,
        entityId: primaryEntity.id,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        subtype: acc.subtype,
        description: acc.description,
        isSystem: true,
      },
    });
    createdAccountMap[acc.code] = record.id;
  }

  console.log(`Seeded ${defaultAccounts.length} Chart of Accounts records.`);

  // 5. Seed Entity Accounting Settings
  await prisma.accountingSettings.upsert({
    where: { entityId: primaryEntity.id },
    update: {
      arAccountId: createdAccountMap['1100'],
      defaultRevenueAccountId: createdAccountMap['4000'],
      outputTaxAccountId: createdAccountMap['2100'],
      apAccountId: createdAccountMap['2000'],
      inputTaxAccountId: createdAccountMap['1150'],
      defaultExpenseAccountId: createdAccountMap['5200'],
      retainedEarningsAccountId: createdAccountMap['3200'],
      customerAdvanceAccountId: createdAccountMap['2150'],
      vendorAdvanceAccountId: createdAccountMap['1160'],
      bankFeeExpenseAccountId: createdAccountMap['6800'],
      bankInterestIncomeAccountId: createdAccountMap['4800'],
      inventoryAccountId: createdAccountMap['1200'] || createdAccountMap['1140'],
      cogsAccountId: createdAccountMap['5000'],
      grniAccountId: createdAccountMap['2140'],
      inventoryAdjustmentAccountId: createdAccountMap['5800'],
      inventoryAdjustmentGainAccountId: createdAccountMap['4900'],
    },
    create: {
      organizationId: organization.id,
      entityId: primaryEntity.id,
      arAccountId: createdAccountMap['1100'],
      defaultRevenueAccountId: createdAccountMap['4000'],
      outputTaxAccountId: createdAccountMap['2100'],
      apAccountId: createdAccountMap['2000'],
      inputTaxAccountId: createdAccountMap['1150'],
      defaultExpenseAccountId: createdAccountMap['5200'],
      retainedEarningsAccountId: createdAccountMap['3200'],
      customerAdvanceAccountId: createdAccountMap['2150'],
      vendorAdvanceAccountId: createdAccountMap['1160'],
      bankFeeExpenseAccountId: createdAccountMap['6800'],
      bankInterestIncomeAccountId: createdAccountMap['4800'],
      inventoryAccountId: createdAccountMap['1200'] || createdAccountMap['1140'],
      cogsAccountId: createdAccountMap['5000'],
      grniAccountId: createdAccountMap['2140'],
      inventoryAdjustmentAccountId: createdAccountMap['5800'],
      inventoryAdjustmentGainAccountId: createdAccountMap['4900'],
    },
  });

  console.log('Seeded Accounting Settings for Entity BC-HO.');

  // 6. Seed Cash & Bank Accounts (Exact Demo Accounts from Screenshot 1 & 3)
  const cashAcc = await prisma.cashBankAccount.upsert({
    where: {
      entityId_code: {
        entityId: primaryEntity.id,
        code: 'CB-001',
      },
    },
    update: {
      name: 'Kas Kecil Cabang Jakarta',
      openingBalance: new Decimal(15000000),
    },
    create: {
      organizationId: organization.id,
      entityId: primaryEntity.id,
      code: 'CB-001',
      name: 'Kas Kecil Cabang Jakarta',
      type: CashBankAccountType.CASH,
      coaAccountId: createdAccountMap['1001'],
      openingBalance: new Decimal(15000000),
      currency: 'IDR',
      isActive: true,
    },
  });

  const bcaAcc = await prisma.cashBankAccount.upsert({
    where: {
      entityId_code: {
        entityId: primaryEntity.id,
        code: 'CB-002',
      },
    },
    update: {
      name: 'Bank BCA Priority',
      openingBalance: new Decimal(1250000000),
    },
    create: {
      organizationId: organization.id,
      entityId: primaryEntity.id,
      code: 'CB-002',
      name: 'Bank BCA Priority',
      type: CashBankAccountType.BANK,
      coaAccountId: createdAccountMap['1002'],
      bankName: 'PT Bank Central Asia Tbk',
      bankAccountNumber: '8820199201',
      bankAccountHolder: 'PT Berkah Cahaya Nusantara',
      branch: 'KCU Sudirman Jakarta',
      swiftCode: 'CENAIDJA',
      openingBalance: new Decimal(1250000000),
      currency: 'IDR',
      isActive: true,
    },
  });

  const mandiriAcc = await prisma.cashBankAccount.upsert({
    where: {
      entityId_code: {
        entityId: primaryEntity.id,
        code: 'CB-003',
      },
    },
    update: {
      name: 'Bank Mandiri Corporate',
      openingBalance: new Decimal(680000000),
    },
    create: {
      organizationId: organization.id,
      entityId: primaryEntity.id,
      code: 'CB-003',
      name: 'Bank Mandiri Corporate',
      type: CashBankAccountType.BANK,
      coaAccountId: createdAccountMap['1003'],
      bankName: 'PT Bank Mandiri (Persero) Tbk',
      bankAccountNumber: '13200998811',
      bankAccountHolder: 'PT Berkah Cahaya Nusantara',
      branch: 'KC Thamrin Jakarta',
      swiftCode: 'BMRIIDJA',
      openingBalance: new Decimal(680000000),
      currency: 'IDR',
      isActive: true,
    },
  });

  console.log(`Seeded Cash/Bank Accounts: ${cashAcc.name}, ${bcaAcc.name}, ${mandiriAcc.name}`);

  // 7. Seed Vendors (Matching Screenshot 3)
  const vendor1 = await prisma.vendor.upsert({
    where: {
      entityId_vendorCode: {
        entityId: primaryEntity.id,
        vendorCode: 'VEN-000001',
      },
    },
    update: {
      name: 'AWS Indonesia',
      legalName: 'Budi Santoso',
      email: 'budi.s@aws.id',
      phone: '0812-3456-7890',
    },
    create: {
      organizationId: organization.id,
      entityId: primaryEntity.id,
      vendorCode: 'VEN-000001',
      name: 'AWS Indonesia',
      legalName: 'Budi Santoso',
      email: 'budi.s@aws.id',
      phone: '0812-3456-7890',
      taxId: '01.888.777.6-055.000',
      billingAddress: 'Capital Place Lt. 22, Jl. Jend. Gatot Subroto, Jakarta Selatan',
      bankDetails: 'Bank BCA 8820019288 a/n AWS Indonesia',
      paymentTermsDays: 30,
      creditLimit: new Decimal(200000000),
      isActive: true,
    },
  });

  const vendor2 = await prisma.vendor.upsert({
    where: {
      entityId_vendorCode: {
        entityId: primaryEntity.id,
        vendorCode: 'VEN-000002',
      },
    },
    update: {
      name: 'Digital Marketing Agency',
      legalName: 'David Lee',
      email: 'david@digitalagency.com',
      phone: '0815-5566-7788',
    },
    create: {
      organizationId: organization.id,
      entityId: primaryEntity.id,
      vendorCode: 'VEN-000002',
      name: 'Digital Marketing Agency',
      legalName: 'David Lee',
      email: 'david@digitalagency.com',
      phone: '0815-5566-7788',
      taxId: '02.777.666.5-044.000',
      billingAddress: 'Sudirman Central Business District (SCBD) Lot 9, Jakarta Selatan',
      bankDetails: 'Bank Mandiri 1220004567891 a/n Digital Marketing Agency',
      paymentTermsDays: 14,
      creditLimit: new Decimal(75000000),
      isActive: true,
    },
  });

  console.log(`Seeded Vendors: ${vendor1.name}, ${vendor2.name}`);

  // 7b. Seed Exact 2026-08 Budgets (Matching Screenshot 1)
  const demoBudgets = [
    {
      accountCode: '5100', // Beban Gaji Direksi & Staf
      period: '2026-08',
      amount: 200000000,
      notes: 'Pagu anggaran gaji dan kompensasi direksi & operasional staff Agustus 2026',
    },
    {
      accountCode: '5300', // Beban Marketing Campaign
      period: '2026-08',
      amount: 75000000,
      notes: 'Pagu kampanye digital marketing multi-channel Agustus 2026',
    },
  ];

  for (const b of demoBudgets) {
    const accId = createdAccountMap[b.accountCode];
    if (accId) {
      await prisma.budget.upsert({
        where: {
          entityId_accountId_period: {
            entityId: primaryEntity.id,
            accountId: accId,
            period: b.period,
          },
        },
        update: {
          amount: new Decimal(b.amount),
          notes: b.notes,
        },
        create: {
          organizationId: organization.id,
          entityId: primaryEntity.id,
          accountId: accId,
          period: b.period,
          amount: new Decimal(b.amount),
          notes: b.notes,
          createdById: ownerUser.id,
        },
      });
    }
  }

  console.log('Seeded 2026-08 Fiscal Budgets matching Screenshot 1.');

  // 8. Seed Customers (Matching Screenshot 2)
  const customer1 = await prisma.customer.upsert({
    where: {
      entityId_customerCode: {
        entityId: primaryEntity.id,
        customerCode: 'CUS-000001',
      },
    },
    update: {
      name: 'PT. Astra International',
      email: 'billing@astra.co.id',
    },
    create: {
      organizationId: organization.id,
      entityId: primaryEntity.id,
      customerCode: 'CUS-000001',
      name: 'PT. Astra International',
      legalName: 'PT Astra International Tbk',
      email: 'billing@astra.co.id',
      phone: '+62-21-5551234',
      taxId: '01.234.567.8-012.000',
      billingAddress: 'Menara Astra, Jl. Jend. Sudirman Kav. 5-6, Jakarta Pusat',
      paymentTermsDays: 30,
      creditLimit: new Decimal(500000000),
      isActive: true,
    },
  });

  const customer2 = await prisma.customer.upsert({
    where: {
      entityId_customerCode: {
        entityId: primaryEntity.id,
        customerCode: 'CUS-000002',
      },
    },
    update: {
      name: 'Kementerian Keuangan RI',
      email: 'finance@kemenkeu.go.id',
    },
    create: {
      organizationId: organization.id,
      entityId: primaryEntity.id,
      customerCode: 'CUS-000002',
      name: 'Kementerian Keuangan RI',
      legalName: 'Kementerian Keuangan Republik Indonesia',
      email: 'finance@kemenkeu.go.id',
      phone: '+62-21-3449230',
      taxId: '00.000.000.0-001.000',
      billingAddress: 'Gedung Djuanda I, Jl. Dr. Wahidin Raya No. 1, Jakarta Pusat',
      paymentTermsDays: 14,
      creditLimit: new Decimal(1000000000),
      isActive: true,
    },
  });

  console.log(`Seeded Customers: ${customer1.name}, ${customer2.name}`);

  // 8b. Seed Exact Sales Invoices (with realistic Overdue and Pending invoices)
  const customer3 = await prisma.customer.upsert({
    where: {
      entityId_customerCode: {
        entityId: primaryEntity.id,
        customerCode: 'CUS-000003',
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      entityId: primaryEntity.id,
      customerCode: 'CUS-000003',
      name: 'Bank Mandiri Persero Tbk',
      legalName: 'PT Bank Mandiri (Persero) Tbk',
      email: 'procurement@bankmandiri.co.id',
      phone: '+62-21-5265555',
      taxId: '01.000.012.3-091.000',
      billingAddress: 'Plaza Mandiri, Jl. Jend. Gatot Subroto Kav. 36-38, Jakarta Selatan',
      paymentTermsDays: 30,
      creditLimit: new Decimal(800000000),
      isActive: true,
    },
  });

  const invoice1 = await prisma.salesInvoice.upsert({
    where: {
      entityId_invoiceNumber: {
        entityId: primaryEntity.id,
        invoiceNumber: 'INV-2026-ENT01',
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      entityId: primaryEntity.id,
      invoiceNumber: 'INV-2026-ENT01',
      customerId: customer1.id,
      invoiceDate: new Date('2026-08-21'),
      dueDate: new Date('2026-09-20'),
      currency: 'IDR',
      exchangeRate: new Decimal(1),
      subtotal: new Decimal(350000000),
      discountAmount: new Decimal(0),
      taxAmount: new Decimal(38500000),
      totalAmount: new Decimal(388500000),
      amountPaid: new Decimal(388500000),
      amountDue: new Decimal(0),
      status: 'PAID' as any,
      postingStatus: 'POSTED' as any,
      lines: {
        create: [
          {
            description: 'Corporate Financial Management Software Term 1',
            quantity: new Decimal(1),
            unitPrice: new Decimal(350000000),
            lineSubtotal: new Decimal(350000000),
            discountAmount: new Decimal(0),
            taxRate: new Decimal(0.11),
            taxAmount: new Decimal(38500000),
            lineTotal: new Decimal(388500000),
            revenueAccountId: createdAccountMap['4000'],
          },
        ],
      },
    },
  });

  const invoice2 = await prisma.salesInvoice.upsert({
    where: {
      entityId_invoiceNumber: {
        entityId: primaryEntity.id,
        invoiceNumber: 'INV-2026-ENT02',
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      entityId: primaryEntity.id,
      invoiceNumber: 'INV-2026-ENT02',
      customerId: customer2.id,
      invoiceDate: new Date('2026-08-26'),
      dueDate: new Date('2026-09-15'),
      currency: 'IDR',
      exchangeRate: new Decimal(1),
      subtotal: new Decimal(720000000),
      discountAmount: new Decimal(0),
      taxAmount: new Decimal(79200000),
      totalAmount: new Decimal(799200000),
      amountPaid: new Decimal(0),
      amountDue: new Decimal(799200000),
      status: 'SENT' as any,
      postingStatus: 'POSTED' as any,
      lines: {
        create: [
          {
            description: 'Enterprise Financial Core Implementation',
            quantity: new Decimal(1),
            unitPrice: new Decimal(720000000),
            lineSubtotal: new Decimal(720000000),
            discountAmount: new Decimal(0),
            taxRate: new Decimal(0.11),
            taxAmount: new Decimal(79200000),
            lineTotal: new Decimal(799200000),
            revenueAccountId: createdAccountMap['4000'],
          },
        ],
      },
    },
  });

  const invoice3 = await prisma.salesInvoice.upsert({
    where: {
      entityId_invoiceNumber: {
        entityId: primaryEntity.id,
        invoiceNumber: 'INV-2026-ENT03',
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      entityId: primaryEntity.id,
      invoiceNumber: 'INV-2026-ENT03',
      customerId: customer3.id,
      invoiceDate: new Date('2026-07-10'),
      dueDate: new Date('2026-08-10'),
      currency: 'IDR',
      exchangeRate: new Decimal(1),
      subtotal: new Decimal(180000000),
      discountAmount: new Decimal(0),
      taxAmount: new Decimal(19800000),
      totalAmount: new Decimal(199800000),
      amountPaid: new Decimal(0),
      amountDue: new Decimal(199800000),
      status: 'OVERDUE' as any,
      postingStatus: 'POSTED' as any,
      lines: {
        create: [
          {
            description: 'Banking Module Integration & API Gateway',
            quantity: new Decimal(1),
            unitPrice: new Decimal(180000000),
            lineSubtotal: new Decimal(180000000),
            discountAmount: new Decimal(0),
            taxRate: new Decimal(0.11),
            taxAmount: new Decimal(19800000),
            lineTotal: new Decimal(199800000),
            revenueAccountId: createdAccountMap['4100'],
          },
        ],
      },
    },
  });

  console.log(`Seeded Invoices: ${invoice1.invoiceNumber}, ${invoice2.invoiceNumber}, ${invoice3.invoiceNumber}`);

  // 8c. Seed Exact Vendor Bill (Matching Screenshot 1)
  const bill1 = await prisma.vendorBill.upsert({
    where: {
      entityId_billNumber: {
        entityId: primaryEntity.id,
        billNumber: 'BILL-2026-VND01',
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      entityId: primaryEntity.id,
      billNumber: 'BILL-2026-VND01',
      vendorId: vendor1.id,
      vendorReference: 'AWS-INV-AUG-2026',
      billDate: new Date('2026-08-29'),
      dueDate: new Date('2026-09-12'),
      currency: 'IDR',
      exchangeRate: new Decimal(1),
      subtotal: new Decimal(95000000),
      discountAmount: new Decimal(0),
      taxAmount: new Decimal(10450000),
      totalAmount: new Decimal(105450000),
      amountPaid: new Decimal(105450000),
      amountDue: new Decimal(0),
      status: 'PAID' as any,
      postingStatus: 'POSTED' as any,
      lines: {
        create: [
          {
            description: 'Cloud Server Infrastructure AWS Enterprise Tier',
            quantity: new Decimal(1),
            unitPrice: new Decimal(95000000),
            lineSubtotal: new Decimal(95000000),
            discountAmount: new Decimal(0),
            taxRate: new Decimal(0.11),
            taxAmount: new Decimal(10450000),
            lineTotal: new Decimal(105450000),
            expenseAccountId: createdAccountMap['5000'],
          },
        ],
      },
    },
  });

  const bill2 = await prisma.vendorBill.upsert({
    where: {
      entityId_billNumber: {
        entityId: primaryEntity.id,
        billNumber: 'BILL-2026-VND02',
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      entityId: primaryEntity.id,
      billNumber: 'BILL-2026-VND02',
      vendorId: vendor2.id,
      vendorReference: 'DMA-AUG-2026',
      billDate: new Date('2026-08-15'),
      dueDate: new Date('2026-08-29'),
      currency: 'IDR',
      exchangeRate: new Decimal(1),
      subtotal: new Decimal(50000000),
      discountAmount: new Decimal(0),
      taxAmount: new Decimal(5500000),
      totalAmount: new Decimal(55500000),
      amountPaid: new Decimal(0),
      amountDue: new Decimal(55500000),
      status: 'OVERDUE' as any,
      postingStatus: 'POSTED' as any,
      lines: {
        create: [
          {
            description: 'Digital Performance Marketing & Ads Placement',
            quantity: new Decimal(1),
            unitPrice: new Decimal(50000000),
            lineSubtotal: new Decimal(50000000),
            discountAmount: new Decimal(0),
            taxRate: new Decimal(0.11),
            taxAmount: new Decimal(5500000),
            lineTotal: new Decimal(55500000),
            expenseAccountId: createdAccountMap['5300'],
          },
        ],
      },
    },
  });

  console.log(`Seeded Vendor Bills: ${bill1.billNumber}, ${bill2.billNumber}`);

  // 9. Seed Opening Journal Entry (Complete Non-Zero Balances for Chart of Accounts)
  await prisma.journalEntry.upsert({
    where: {
      entityId_entryNumber: {
        entityId: primaryEntity.id,
        entryNumber: 'JE-2026-000001',
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      entityId: primaryEntity.id,
      entryNumber: 'JE-2026-000001',
      entryDate: new Date('2026-01-01'),
      reference: 'BAL-OPENING-2026',
      description: 'Saldo Awal Pembukuan Tahun Fiskal 2026',
      status: JournalEntryStatus.POSTED,
      postedAt: new Date('2026-01-01'),
      postedById: ownerUser.id,
      lines: {
        create: [
          { accountId: createdAccountMap['1001'], debit: new Decimal(15000000), credit: new Decimal(0), description: 'Kas Kecil Cabang Jakarta' },
          { accountId: createdAccountMap['1002'], debit: new Decimal(1250000000), credit: new Decimal(0), description: 'Bank BCA Priority' },
          { accountId: createdAccountMap['1003'], debit: new Decimal(680000000), credit: new Decimal(0), description: 'Bank Mandiri Corporate' },
          { accountId: createdAccountMap['1100'], debit: new Decimal(450000000), credit: new Decimal(0), description: 'Piutang Usaha Korporat' },
          { accountId: createdAccountMap['1140'], debit: new Decimal(150000000), credit: new Decimal(0), description: 'Persediaan Barang Dagang' },
          { accountId: createdAccountMap['1150'], debit: new Decimal(45000000), credit: new Decimal(0), description: 'PPN Masukan (Input Tax)' },
          { accountId: createdAccountMap['1160'], debit: new Decimal(25000000), credit: new Decimal(0), description: 'Uang Muka Pembelian' },
          { accountId: createdAccountMap['1200'], debit: new Decimal(1200000000), credit: new Decimal(0), description: 'Persediaan Finished Goods' },
          { accountId: createdAccountMap['1500'], debit: new Decimal(5500000000), credit: new Decimal(0), description: 'Aset Tetap Gedung Merdeka' },
          { accountId: createdAccountMap['1510'], debit: new Decimal(0), credit: new Decimal(250000000), description: 'Akumulasi Penyusutan Gedung' },
          { accountId: createdAccountMap['1520'], debit: new Decimal(450000000), credit: new Decimal(0), description: 'Aset Tetap Kendaraan' },
          { accountId: createdAccountMap['1530'], debit: new Decimal(0), credit: new Decimal(90000000), description: 'Akumulasi Penyusutan Kendaraan' },
          { accountId: createdAccountMap['1590'], debit: new Decimal(800000000), credit: new Decimal(0), description: 'Aset Tetap Tanah' },
          { accountId: createdAccountMap['2000'], debit: new Decimal(0), credit: new Decimal(240000000), description: 'Utang Dagang Supplier' },
          { accountId: createdAccountMap['2100'], debit: new Decimal(0), credit: new Decimal(75000000), description: 'Utang PPN Masukan' },
          { accountId: createdAccountMap['2110'], debit: new Decimal(0), credit: new Decimal(35000000), description: 'Utang PPh 21/23' },
          { accountId: createdAccountMap['2140'], debit: new Decimal(0), credit: new Decimal(50000000), description: 'GRNI Clearing' },
          { accountId: createdAccountMap['2150'], debit: new Decimal(0), credit: new Decimal(60000000), description: 'Pendapatan Diterima Dimuka' },
          { accountId: createdAccountMap['3000'], debit: new Decimal(0), credit: new Decimal(8000000000), description: 'Modal Ventura Seri-A' },
          { accountId: createdAccountMap['4000'], debit: new Decimal(0), credit: new Decimal(850000000), description: 'Pendapatan Kontrak Software' },
          { accountId: createdAccountMap['4100'], debit: new Decimal(0), credit: new Decimal(350000000), description: 'Pendapatan Lisensi API' },
          { accountId: createdAccountMap['5000'], debit: new Decimal(180000000), credit: new Decimal(0), description: 'HPP Layanan Cloud' },
          { accountId: createdAccountMap['5100'], debit: new Decimal(420000000), credit: new Decimal(0), description: 'Beban Gaji Direksi & Staf' },
          { accountId: createdAccountMap['5200'], debit: new Decimal(120000000), credit: new Decimal(0), description: 'Beban Sewa Data Center' },
          { accountId: createdAccountMap['5300'], debit: new Decimal(95000000), credit: new Decimal(0), description: 'Beban Marketing Campaign' },
          { accountId: createdAccountMap['3200'], debit: new Decimal(0), credit: new Decimal(1380000000), description: 'Laba Ditahan Operasional' },
        ],
      },
    },
  });

  // 9b. Seed Year-Round Monthly Transactions (Jan - Aug 2026) for Rich Dashboard Charts
  const monthlyHistoricalEntries = [
    // January
    { entryNumber: 'JE-2026-M01', date: new Date('2026-01-28'), desc: 'Pendapatan Lisensi SaaS Jan 2026', drAcc: '1002', crAcc: '4000', amount: 120000000 },
    { entryNumber: 'JE-2026-M02', date: new Date('2026-01-30'), desc: 'Beban Operasional & Server Jan 2026', drAcc: '5000', crAcc: '1002', amount: 90000000 },
    // February
    { entryNumber: 'JE-2026-M03', date: new Date('2026-02-27'), desc: 'Pendapatan Kontrak Cloud Feb 2026', drAcc: '1002', crAcc: '4000', amount: 140000000 },
    { entryNumber: 'JE-2026-M04', date: new Date('2026-02-28'), desc: 'Payroll & Hosting Feb 2026', drAcc: '5100', crAcc: '1003', amount: 105000000 },
    // March
    { entryNumber: 'JE-2026-M05', date: new Date('2026-03-28'), desc: 'Lisensi Enterprise Mar 2026', drAcc: '1002', crAcc: '4100', amount: 165000000 },
    { entryNumber: 'JE-2026-M06', date: new Date('2026-03-30'), desc: 'Beban Infrastruktur & Marketing Mar 2026', drAcc: '5300', crAcc: '1002', amount: 120000000 },
    // April
    { entryNumber: 'JE-2026-M07', date: new Date('2026-04-28'), desc: 'Software Subscription Q2 Apr 2026', drAcc: '1002', crAcc: '4000', amount: 190000000 },
    { entryNumber: 'JE-2026-M08', date: new Date('2026-04-30'), desc: 'Operasional & Data Center Apr 2026', drAcc: '5200', crAcc: '1003', amount: 135000000 },
    // May
    { entryNumber: 'JE-2026-M09', date: new Date('2026-05-28'), desc: 'Enterprise SaaS Renewal May 2026', drAcc: '1002', crAcc: '4000', amount: 220000000 },
    { entryNumber: 'JE-2026-M10', date: new Date('2026-05-30'), desc: 'Beban Gaji & Cloud May 2026', drAcc: '5100', crAcc: '1003', amount: 150000000 },
    // June
    { entryNumber: 'JE-2026-M11', date: new Date('2026-06-28'), desc: 'Implementasi ERP Klien Jun 2026', drAcc: '1002', crAcc: '4000', amount: 260000000 },
    { entryNumber: 'JE-2026-M12', date: new Date('2026-06-30'), desc: 'HPP Server AWS & Opex Jun 2026', drAcc: '5000', crAcc: '1002', amount: 175000000 },
    // July
    { entryNumber: 'JE-2026-M13', date: new Date('2026-07-28'), desc: 'Pendapatan Kontrak Software Jul 2026', drAcc: '1002', crAcc: '4000', amount: 310000000 },
    { entryNumber: 'JE-2026-M14', date: new Date('2026-07-30'), desc: 'Beban Operasional & Marketing Jul 2026', drAcc: '5300', crAcc: '1002', amount: 210000000 },
  ];

  for (const hist of monthlyHistoricalEntries) {
    await prisma.journalEntry.upsert({
      where: {
        entityId_entryNumber: {
          entityId: primaryEntity.id,
          entryNumber: hist.entryNumber,
        },
      },
      update: {
        description: hist.desc,
        entryDate: hist.date,
      },
      create: {
        organizationId: organization.id,
        entityId: primaryEntity.id,
        entryNumber: hist.entryNumber,
        entryDate: hist.date,
        reference: hist.entryNumber,
        description: hist.desc,
        status: JournalEntryStatus.POSTED,
        postedAt: hist.date,
        postedById: ownerUser.id,
        lines: {
          create: [
            { accountId: createdAccountMap[hist.drAcc], debit: new Decimal(hist.amount), credit: new Decimal(0), description: hist.desc },
            { accountId: createdAccountMap[hist.crAcc], debit: new Decimal(0), credit: new Decimal(hist.amount), description: hist.desc },
          ],
        },
      },
    });
  }

  // 9c. Seed Exact 5 August General Journal Transactions (Matching Screenshot 3 with non-zero values)
  const demoAugustTransactions = [
    {
      entryNumber: 'JE-0001',
      date: new Date('2026-08-31'),
      desc: 'Terima Termin 1 PT. Astra International',
      drAcc: '1002', // Bank BCA Priority
      crAcc: '1100', // Piutang Usaha Korporat
      amount: 350000000,
    },
    {
      entryNumber: 'JE-0002',
      date: new Date('2026-08-30'),
      desc: 'Bayar Cloud Server AWS',
      drAcc: '5000', // HPP Layanan Cloud
      crAcc: '1002', // Bank BCA Priority
      amount: 95000000,
    },
    {
      entryNumber: 'JE-0003',
      date: new Date('2026-08-29'),
      desc: 'Distribusi Payroll Bulanan Direksi',
      drAcc: '5100', // Beban Gaji Direksi & Staf
      crAcc: '1003', // Bank Mandiri Corporate
      amount: 185000000,
    },
    {
      entryNumber: 'JE-0004',
      date: new Date('2026-08-27'),
      desc: 'SaaS Agreement - Singapore Corp',
      drAcc: '1002', // Bank BCA Priority
      crAcc: '4000', // Pendapatan Kontrak Software
      amount: 48000000, // IDR 48,000,000 realistic nominal
    },
    {
      entryNumber: 'JE-0005',
      date: new Date('2026-08-25'),
      desc: 'Bayar Kampanye Digital agency',
      drAcc: '5300', // Beban Marketing Campaign
      crAcc: '1002', // Bank BCA Priority
      amount: 50000000,
    },
  ];

  for (const tx of demoAugustTransactions) {
    await prisma.journalEntry.upsert({
      where: {
        entityId_entryNumber: {
          entityId: primaryEntity.id,
          entryNumber: tx.entryNumber,
        },
      },
      update: {
        description: tx.desc,
        entryDate: tx.date,
      },
      create: {
        organizationId: organization.id,
        entityId: primaryEntity.id,
        entryNumber: tx.entryNumber,
        entryDate: tx.date,
        reference: tx.entryNumber,
        description: tx.desc,
        status: JournalEntryStatus.POSTED,
        postedAt: tx.date,
        postedById: ownerUser.id,
        lines: {
          create: [
            { accountId: createdAccountMap[tx.drAcc], debit: new Decimal(tx.amount), credit: new Decimal(0), description: tx.desc },
            { accountId: createdAccountMap[tx.crAcc], debit: new Decimal(0), credit: new Decimal(tx.amount), description: tx.desc },
          ],
        },
      },
    });
  }

  console.log('Seeded Year-Round General Journal entries (Jan - Aug 2026).');

  console.log('Seeded 5 August General Journal entries matching Screenshot 3.');

  console.log('Seeded 5 August Demo Transactions matching screenshot.');

  // 10. Seed Units of Measure, Categories, Warehouses & Inventory Items (Matching Screenshot 1)
  const uomPcs = await prisma.unitOfMeasure.upsert({
    where: { organizationId_code: { organizationId: organization.id, code: 'PCS' } },
    update: {},
    create: { organizationId: organization.id, code: 'PCS', name: 'pcs', precision: 0 },
  });

  const uomUnits = await prisma.unitOfMeasure.upsert({
    where: { organizationId_code: { organizationId: organization.id, code: 'UNITS' } },
    update: {},
    create: { organizationId: organization.id, code: 'UNITS', name: 'units', precision: 0 },
  });

  const catHardware = await prisma.inventoryCategory.upsert({
    where: { entityId_code: { entityId: primaryEntity.id, code: 'HARDWARE' } },
    update: { name: 'HARDWARE' },
    create: {
      organizationId: organization.id,
      entityId: primaryEntity.id,
      code: 'HARDWARE',
      name: 'HARDWARE',
    },
  });

  const catNetwork = await prisma.inventoryCategory.upsert({
    where: { entityId_code: { entityId: primaryEntity.id, code: 'NETWORK' } },
    update: { name: 'NETWORK' },
    create: {
      organizationId: organization.id,
      entityId: primaryEntity.id,
      code: 'NETWORK',
      name: 'NETWORK',
    },
  });

  const whJakarta = await prisma.warehouse.upsert({
    where: { entityId_code: { entityId: primaryEntity.id, code: 'WH-JKT' } },
    update: {},
    create: {
      organizationId: organization.id,
      entityId: primaryEntity.id,
      code: 'WH-JKT',
      name: 'Gudang Utama Jakarta',
      address: 'Kawasan Industri Pulogadung, Jakarta Timur',
    },
  });

  const itemServer = await prisma.inventoryItem.upsert({
    where: { entityId_sku: { entityId: primaryEntity.id, sku: 'SVR-DL380' } },
    update: {
      name: 'Central Hardware Server Cluster DL380',
      purchasePrice: new Decimal(150000000),
      valuationMethod: 'FIFO',
      categoryId: catHardware.id,
      unitOfMeasureId: uomUnits.id,
    },
    create: {
      organizationId: organization.id,
      entityId: primaryEntity.id,
      sku: 'SVR-DL380',
      name: 'Central Hardware Server Cluster DL380',
      description: 'HPE ProLiant DL380 Gen10 High Performance Server Cluster',
      categoryId: catHardware.id,
      unitOfMeasureId: uomUnits.id,
      valuationMethod: 'FIFO',
      inventoryAccountId: createdAccountMap['1200'],
      cogsAccountId: createdAccountMap['5000'],
      salesAccountId: createdAccountMap['4000'],
      reorderLevel: new Decimal(2),
      sellingPrice: new Decimal(185000000),
      purchasePrice: new Decimal(150000000),
      isInventoryTracked: true,
      isActive: true,
    },
  });

  const itemRouter = await prisma.inventoryItem.upsert({
    where: { entityId_sku: { entityId: primaryEntity.id, sku: 'RT-CIS-93' } },
    update: {
      name: 'Cisco Enterprise Layer 3 Router 9300',
      purchasePrice: new Decimal(35000000),
      valuationMethod: 'WEIGHTED_AVERAGE',
      categoryId: catNetwork.id,
      unitOfMeasureId: uomPcs.id,
    },
    create: {
      organizationId: organization.id,
      entityId: primaryEntity.id,
      sku: 'RT-CIS-93',
      name: 'Cisco Enterprise Layer 3 Router 9300',
      description: 'Cisco Catalyst 9300 Enterprise Gigabit Layer 3 Switch/Router',
      categoryId: catNetwork.id,
      unitOfMeasureId: uomPcs.id,
      valuationMethod: 'WEIGHTED_AVERAGE',
      inventoryAccountId: createdAccountMap['1200'],
      cogsAccountId: createdAccountMap['5000'],
      salesAccountId: createdAccountMap['4000'],
      reorderLevel: new Decimal(5),
      sellingPrice: new Decimal(45000000),
      purchasePrice: new Decimal(35000000),
      isInventoryTracked: true,
      isActive: true,
    },
  });

  // Seed Opening Stock Movements & Layers for exact stock levels
  await prisma.stockMovement.upsert({
    where: {
      id: 'sm-opening-server-01',
    },
    update: {
      quantity: new Decimal(9),
      unitCost: new Decimal(150000000),
      totalCost: new Decimal(1350000000),
    },
    create: {
      id: 'sm-opening-server-01',
      organizationId: organization.id,
      entityId: primaryEntity.id,
      movementNumber: 'MOV-2026-000001',
      warehouseId: whJakarta.id,
      itemId: itemServer.id,
      movementType: 'OPENING' as any,
      movementDate: new Date('2026-01-01'),
      quantity: new Decimal(9),
      unitCost: new Decimal(150000000),
      totalCost: new Decimal(1350000000),
      sourceType: 'MANUAL',
      sourceId: 'BAL-OPENING-2026',
      status: 'POSTED' as any,
      reference: 'STOCK-OP-SVR',
      createdById: ownerUser.id,
    },
  });

  await prisma.stockMovement.upsert({
    where: {
      id: 'sm-opening-router-01',
    },
    update: {
      quantity: new Decimal(15),
      unitCost: new Decimal(35000000),
      totalCost: new Decimal(525000000),
    },
    create: {
      id: 'sm-opening-router-01',
      organizationId: organization.id,
      entityId: primaryEntity.id,
      movementNumber: 'MOV-2026-000002',
      warehouseId: whJakarta.id,
      itemId: itemRouter.id,
      movementType: 'OPENING' as any,
      movementDate: new Date('2026-01-01'),
      quantity: new Decimal(15),
      unitCost: new Decimal(35000000),
      totalCost: new Decimal(525000000),
      sourceType: 'MANUAL',
      sourceId: 'BAL-OPENING-2026',
      status: 'POSTED' as any,
      reference: 'STOCK-OP-RT',
      createdById: ownerUser.id,
    },
  });

  console.log(`Seeded Items: ${itemServer.name} (9 units), ${itemRouter.name} (15 pcs)`);

  // --- PHASE 7 FIXED ASSETS & CATEGORIES SEED (Matching Screenshot 2) ---
  const catEquipment = await prisma.fixedAssetCategory.upsert({
    where: { entityId_code: { entityId: primaryEntity.id, code: 'EQUIPMENT' } },
    update: {},
    create: {
      organizationId: organization.id,
      entityId: primaryEntity.id,
      code: 'EQUIPMENT',
      name: 'EQUIPMENT',
      description: 'Server HP, Komputer, Laptop dan Peralatan Jaringan',
      fixedAssetAccountId: createdAccountMap['1500'],
      accumulatedDepreciationAccountId: createdAccountMap['1510'] || createdAccountMap['1500'],
      depreciationExpenseAccountId: createdAccountMap['5000'],
      gainOnDisposalAccountId: createdAccountMap['4000'],
      lossOnDisposalAccountId: createdAccountMap['5000'],
      defaultUsefulLifeMonths: 60,
      defaultDepreciationMethod: 'STRAIGHT_LINE',
      defaultResidualValuePercent: new Decimal(0),
      isActive: true,
    },
  });

  // Seed Fixed Asset AST-EQ-100
  const assetServer = await prisma.fixedAsset.upsert({
    where: {
      entityId_assetNumber: {
        entityId: primaryEntity.id,
        assetNumber: 'AST-EQ-100',
      },
    },
    update: {
      name: 'Server HP ProLiant Gen10',
      acquisitionDate: new Date('2026-05-03'),
      acquisitionCost: new Decimal(180000000),
      accumulatedDepreciation: new Decimal(9000000),
      netBookValue: new Decimal(171000000),
      depreciableAmount: new Decimal(180000000),
      usefulLifeMonths: 60,
      depreciationMethod: 'STRAIGHT_LINE',
      status: 'ACTIVE' as any,
    },
    create: {
      organizationId: organization.id,
      entityId: primaryEntity.id,
      assetNumber: 'AST-EQ-100',
      categoryId: catEquipment.id,
      name: 'Server HP ProLiant Gen10',
      description: 'Server HP ProLiant Gen10 Enterprise Infrastructure',
      acquisitionDate: new Date('2026-05-03'),
      acquisitionCost: new Decimal(180000000),
      residualValue: new Decimal(0),
      depreciableAmount: new Decimal(180000000),
      accumulatedDepreciation: new Decimal(9000000),
      netBookValue: new Decimal(171000000),
      usefulLifeMonths: 60,
      depreciationMethod: 'STRAIGHT_LINE',
      status: 'ACTIVE' as any,
      createdById: ownerUser.id,
    },
  });

  console.log(`Seeded Fixed Asset: ${assetServer.assetNumber} - ${assetServer.name}`);
  console.log('Phase 7 Seed completed successfully.');
  console.log('Phase 7 Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
