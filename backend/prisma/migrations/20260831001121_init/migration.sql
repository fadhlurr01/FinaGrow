-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'ACCOUNTANT', 'AUDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');

-- CreateEnum
CREATE TYPE "AccountSubtype" AS ENUM ('CURRENT_ASSET', 'NON_CURRENT_ASSET', 'CASH_AND_EQUIVALENT', 'ACCOUNTS_RECEIVABLE', 'INVENTORY', 'PREPAID_EXPENSE', 'FIXED_ASSET', 'ACCUMULATED_DEPRECIATION', 'OTHER_ASSET', 'CURRENT_LIABILITY', 'NON_CURRENT_LIABILITY', 'ACCOUNTS_PAYABLE', 'TAX_PAYABLE', 'ACCRUED_EXPENSE', 'OTHER_LIABILITY', 'EQUITY', 'RETAINED_EARNINGS', 'OPERATING_REVENUE', 'NON_OPERATING_REVENUE', 'COST_OF_GOODS_SOLD', 'OPERATING_EXPENSE', 'PAYROLL_EXPENSE', 'DEPRECIATION_EXPENSE', 'TAX_EXPENSE', 'NON_OPERATING_EXPENSE', 'OTHER_EXPENSE');

-- CreateEnum
CREATE TYPE "NormalBalance" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "JournalEntryStatus" AS ENUM ('DRAFT', 'POSTED', 'VOIDED');

-- CreateEnum
CREATE TYPE "SalesInvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InvoicePostingStatus" AS ENUM ('UNPOSTED', 'POSTED', 'REVERSED');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'APPROVED', 'PARTIALLY_BILLED', 'FULLY_BILLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VendorBillStatus" AS ENUM ('DRAFT', 'OPEN', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BillLineType" AS ENUM ('EXPENSE', 'INVENTORY', 'ASSET', 'SERVICE', 'OTHER');

-- CreateEnum
CREATE TYPE "CashBankAccountType" AS ENUM ('CASH', 'BANK', 'E_WALLET', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('CUSTOMER_RECEIPT', 'VENDOR_PAYMENT', 'TRANSFER', 'OTHER_RECEIPT', 'OTHER_PAYMENT');

-- CreateEnum
CREATE TYPE "PaymentDirection" AS ENUM ('INBOUND', 'OUTBOUND', 'INTERNAL');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('DRAFT', 'POSTED', 'REVERSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BankStatementImportStatus" AS ENUM ('IMPORTED', 'RECONCILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StatementLineStatus" AS ENUM ('UNMATCHED', 'MATCHED', 'PARTIALLY_MATCHED', 'IGNORED', 'RECONCILED');

-- CreateEnum
CREATE TYPE "BankReconciliationStatus" AS ENUM ('IN_PROGRESS', 'RECONCILED', 'REOPENED');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('INVENTORY', 'SERVICE', 'NON_INVENTORY');

-- CreateEnum
CREATE TYPE "ValuationMethod" AS ENUM ('FIFO', 'WEIGHTED_AVERAGE');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('OPENING', 'PURCHASE_RECEIPT', 'SALES_ISSUE', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'RETURN_IN', 'RETURN_OUT');

-- CreateEnum
CREATE TYPE "StockMovementStatus" AS ENUM ('DRAFT', 'POSTED', 'REVERSED');

-- CreateEnum
CREATE TYPE "GoodsReceiptStatus" AS ENUM ('DRAFT', 'POSTED', 'REVERSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('DRAFT', 'POSTED', 'REVERSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StockAdjustmentType" AS ENUM ('INCREASE', 'DECREASE');

-- CreateEnum
CREATE TYPE "StockAdjustmentStatus" AS ENUM ('DRAFT', 'POSTED', 'REVERSED');

-- CreateEnum
CREATE TYPE "StockTransferStatus" AS ENUM ('DRAFT', 'POSTED', 'REVERSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DepreciationMethod" AS ENUM ('STRAIGHT_LINE', 'DECLINING_BALANCE', 'NONE');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('DRAFT', 'ACTIVE', 'FULLY_DEPRECIATED', 'DISPOSED', 'RETIRED', 'IMPAIRED');

-- CreateEnum
CREATE TYPE "DepreciationScheduleStatus" AS ENUM ('SCHEDULED', 'POSTED', 'REVERSED');

-- CreateEnum
CREATE TYPE "DepreciationRunStatus" AS ENUM ('DRAFT', 'CALCULATED', 'POSTED', 'REVERSED');

-- CreateEnum
CREATE TYPE "DisposalType" AS ENUM ('SALE', 'SCRAP', 'RETIREMENT', 'LOSS');

-- CreateEnum
CREATE TYPE "DisposalStatus" AS ENUM ('DRAFT', 'POSTED', 'REVERSED');

-- CreateEnum
CREATE TYPE "TaxType" AS ENUM ('VAT', 'PPH23', 'PPH4_2', 'PPH21', 'PPH26', 'PPNBM', 'OTHER');

-- CreateEnum
CREATE TYPE "TaxDirection" AS ENUM ('OUTPUT', 'INPUT', 'WITHHOLDING_PAYABLE', 'WITHHOLDING_RECEIVABLE');

-- CreateEnum
CREATE TYPE "TaxCalculationMethod" AS ENUM ('PERCENT_OF_BASE', 'RATE_TIMES_DPP_FACTOR', 'FIXED_AMOUNT', 'SPECIAL_FORMULA');

-- CreateEnum
CREATE TYPE "TaxRoundingMethod" AS ENUM ('ROUND_HALF_UP', 'ROUND_DOWN', 'ROUND_UP');

-- CreateEnum
CREATE TYPE "TaxTransactionStatus" AS ENUM ('DRAFT', 'POSTED', 'ADJUSTED', 'REVERSED', 'REPORTED');

-- CreateEnum
CREATE TYPE "TaxPeriodStatus" AS ENUM ('OPEN', 'PREPARED', 'FILED', 'PARTIALLY_PAID', 'PAID', 'CLOSED', 'REOPENED');

-- CreateEnum
CREATE TYPE "TaxDocumentType" AS ENUM ('FAKTUR_PAJAK', 'BUKTI_POTONG', 'SSP', 'OTHER');

-- CreateEnum
CREATE TYPE "TaxDocumentStatus" AS ENUM ('DRAFT', 'READY', 'ISSUED', 'RECEIVED', 'VALIDATED', 'REPORTED', 'CANCELLED', 'REPLACED');

-- CreateEnum
CREATE TYPE "TaxPaymentStatus" AS ENUM ('DRAFT', 'POSTED', 'REVERSED');

-- CreateEnum
CREATE TYPE "WithholdingEvidenceStatus" AS ENUM ('PENDING_DOCUMENT', 'DOCUMENTED', 'REPORTED');

-- CreateEnum
CREATE TYPE "TaxSourceType" AS ENUM ('SALES_INVOICE', 'VENDOR_BILL', 'PAYMENT', 'ASSET_CAPITALIZATION', 'GOODS_RECEIPT', 'MIGRATED_LEGACY', 'MANUAL', 'OTHER');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "base_currency" VARCHAR(10) NOT NULL DEFAULT 'IDR',
    "timezone" VARCHAR(100) NOT NULL DEFAULT 'Asia/Jakarta',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "avatar_url" TEXT,
    "phone" VARCHAR(50),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_members" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entities" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "legal_name" VARCHAR(255),
    "base_currency" VARCHAR(10) NOT NULL DEFAULT 'IDR',
    "country" VARCHAR(10) NOT NULL DEFAULT 'ID',
    "timezone" VARCHAR(100) NOT NULL DEFAULT 'Asia/Jakarta',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" VARCHAR(100) NOT NULL,
    "resource_type" VARCHAR(100) NOT NULL,
    "resource_id" VARCHAR(100),
    "metadata" JSONB,
    "ip_address" VARCHAR(50),
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" "AccountType" NOT NULL,
    "subtype" "AccountSubtype" NOT NULL,
    "normal_balance" "NormalBalance" NOT NULL DEFAULT 'DEBIT',
    "description" TEXT,
    "parent_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'IDR',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "entry_number" VARCHAR(100) NOT NULL,
    "entry_date" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "reference" VARCHAR(255),
    "status" "JournalEntryStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" VARCHAR(10) NOT NULL DEFAULT 'IDR',
    "exchange_rate" DECIMAL(12,6) NOT NULL DEFAULT 1.0,
    "created_by_id" TEXT,
    "posted_by_id" TEXT,
    "posted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_lines" (
    "id" TEXT NOT NULL,
    "journal_entry_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "description" TEXT,
    "debit" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "credit" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'IDR',
    "exchange_rate" DECIMAL(12,6) NOT NULL DEFAULT 1.0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting_settings" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "ar_account_id" TEXT NOT NULL,
    "default_revenue_account_id" TEXT NOT NULL,
    "output_tax_account_id" TEXT NOT NULL,
    "ap_account_id" TEXT,
    "input_tax_account_id" TEXT,
    "default_expense_account_id" TEXT,
    "retained_earnings_account_id" TEXT,
    "customer_advance_account_id" TEXT,
    "vendor_advance_account_id" TEXT,
    "bank_fee_expense_account_id" TEXT,
    "bank_interest_income_account_id" TEXT,
    "bank_suspense_account_id" TEXT,
    "inventory_account_id" TEXT,
    "cogs_account_id" TEXT,
    "grni_account_id" TEXT,
    "inventory_adjustment_account_id" TEXT,
    "inventory_adjustment_gain_account_id" TEXT,
    "vat_payable_account_id" TEXT,
    "pph23_payable_account_id" TEXT,
    "pph23_receivable_account_id" TEXT,
    "pph4_2_payable_account_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounting_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "customer_code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "legal_name" VARCHAR(255),
    "email" VARCHAR(255),
    "phone" VARCHAR(50),
    "tax_id" VARCHAR(100),
    "npwp" VARCHAR(30),
    "is_pkp" BOOLEAN NOT NULL DEFAULT false,
    "default_sales_tax_code_id" TEXT,
    "default_withholding_tax_code_id" TEXT,
    "billing_address" TEXT,
    "shipping_address" TEXT,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'IDR',
    "payment_terms_days" INTEGER NOT NULL DEFAULT 30,
    "credit_limit" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_invoices" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "invoice_number" VARCHAR(100) NOT NULL,
    "invoice_date" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'IDR',
    "exchange_rate" DECIMAL(12,6) NOT NULL DEFAULT 1.0,
    "subtotal" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "discount_amount" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "tax_amount" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "total_amount" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "amount_paid" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "amount_due" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "status" "SalesInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "posting_status" "InvoicePostingStatus" NOT NULL DEFAULT 'UNPOSTED',
    "journal_entry_id" TEXT,
    "notes" TEXT,
    "reference" VARCHAR(255),
    "created_by_id" TEXT,
    "posted_by_id" TEXT,
    "posted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_invoice_lines" (
    "id" TEXT NOT NULL,
    "sales_invoice_id" TEXT NOT NULL,
    "item_id" TEXT,
    "tax_code_id" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL DEFAULT 1.0000,
    "unit_price" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "discount_amount" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "tax_rate" DECIMAL(6,4) NOT NULL DEFAULT 0.0000,
    "tax_amount" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "dpp_amount" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "line_subtotal" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "line_total" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "revenue_account_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_invoice_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "vendor_code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "legal_name" VARCHAR(255),
    "email" VARCHAR(255),
    "phone" VARCHAR(50),
    "tax_id" VARCHAR(100),
    "npwp" VARCHAR(30),
    "is_pkp" BOOLEAN NOT NULL DEFAULT false,
    "default_purchase_tax_code_id" TEXT,
    "default_withholding_tax_code_id" TEXT,
    "billing_address" TEXT,
    "bank_details" TEXT,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'IDR',
    "payment_terms_days" INTEGER NOT NULL DEFAULT 30,
    "credit_limit" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "po_number" VARCHAR(100) NOT NULL,
    "order_date" DATE NOT NULL,
    "expected_date" DATE,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'IDR',
    "exchange_rate" DECIMAL(12,6) NOT NULL DEFAULT 1.0,
    "subtotal" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "discount_amount" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "tax_amount" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "total_amount" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "reference" VARCHAR(255),
    "created_by_id" TEXT,
    "approved_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_lines" (
    "id" TEXT NOT NULL,
    "purchase_order_id" TEXT NOT NULL,
    "item_id" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL DEFAULT 1.0000,
    "unit_price" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "discount_amount" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "tax_rate" DECIMAL(6,4) NOT NULL DEFAULT 0.0000,
    "tax_amount" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "line_subtotal" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "line_total" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "expense_account_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_order_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_bills" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "purchase_order_id" TEXT,
    "bill_number" VARCHAR(100) NOT NULL,
    "vendor_reference" VARCHAR(255),
    "bill_date" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'IDR',
    "exchange_rate" DECIMAL(12,6) NOT NULL DEFAULT 1.0,
    "subtotal" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "discount_amount" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "tax_amount" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "total_amount" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "amount_paid" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "amount_due" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "status" "VendorBillStatus" NOT NULL DEFAULT 'DRAFT',
    "posting_status" "InvoicePostingStatus" NOT NULL DEFAULT 'UNPOSTED',
    "journal_entry_id" TEXT,
    "notes" TEXT,
    "created_by_id" TEXT,
    "posted_by_id" TEXT,
    "posted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_bill_lines" (
    "id" TEXT NOT NULL,
    "vendor_bill_id" TEXT NOT NULL,
    "item_id" TEXT,
    "asset_category_id" TEXT,
    "goods_receipt_line_id" TEXT,
    "tax_code_id" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL DEFAULT 1.0000,
    "unit_price" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "discount_amount" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "tax_rate" DECIMAL(6,4) NOT NULL DEFAULT 0.0000,
    "tax_amount" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "dpp_amount" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "line_subtotal" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "line_total" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "expense_account_id" TEXT,
    "line_type" "BillLineType" NOT NULL DEFAULT 'EXPENSE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_bill_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_bank_accounts" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" "CashBankAccountType" NOT NULL DEFAULT 'BANK',
    "coa_account_id" TEXT NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'IDR',
    "bank_name" VARCHAR(100),
    "bank_account_number" VARCHAR(100),
    "bank_account_holder" VARCHAR(255),
    "branch" VARCHAR(100),
    "swift_code" VARCHAR(50),
    "opening_balance" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "payment_number" VARCHAR(100) NOT NULL,
    "type" "PaymentType" NOT NULL DEFAULT 'CUSTOMER_RECEIPT',
    "direction" "PaymentDirection" NOT NULL DEFAULT 'INBOUND',
    "status" "PaymentStatus" NOT NULL DEFAULT 'DRAFT',
    "payment_date" DATE NOT NULL,
    "customer_id" TEXT,
    "vendor_id" TEXT,
    "cash_bank_account_id" TEXT NOT NULL,
    "to_cash_bank_account_id" TEXT,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'IDR',
    "exchange_rate" DECIMAL(12,6) NOT NULL DEFAULT 1.0,
    "amount" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "allocated_amount" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "unallocated_amount" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "withholding_tax_code_id" TEXT,
    "withholding_tax_amount" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "gross_settlement_amount" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "reference" VARCHAR(255),
    "external_reference" VARCHAR(255),
    "method" VARCHAR(50),
    "journal_entry_id" TEXT,
    "notes" TEXT,
    "created_by_id" TEXT,
    "posted_by_id" TEXT,
    "posted_at" TIMESTAMP(3),
    "reversed_by_id" TEXT,
    "reversed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_allocations" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "sales_invoice_id" TEXT,
    "vendor_bill_id" TEXT,
    "allocated_amount" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_statement_imports" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "cash_bank_account_id" TEXT NOT NULL,
    "source_filename" VARCHAR(255) NOT NULL,
    "statement_start_date" DATE,
    "statement_end_date" DATE,
    "opening_balance" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "closing_balance" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "status" "BankStatementImportStatus" NOT NULL DEFAULT 'IMPORTED',
    "imported_by_id" TEXT,
    "imported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_statement_imports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_statement_lines" (
    "id" TEXT NOT NULL,
    "bank_statement_import_id" TEXT NOT NULL,
    "transaction_date" DATE NOT NULL,
    "value_date" DATE,
    "description" TEXT NOT NULL,
    "reference" VARCHAR(255),
    "debit_amount" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "credit_amount" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "amount" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "balance" DECIMAL(18,4),
    "external_transaction_id" VARCHAR(255),
    "normalized_hash" VARCHAR(64) NOT NULL,
    "reconciliation_status" "StatementLineStatus" NOT NULL DEFAULT 'UNMATCHED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_statement_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_reconciliations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "cash_bank_account_id" TEXT NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "statement_opening_balance" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "statement_closing_balance" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "book_closing_balance" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "difference" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "status" "BankReconciliationStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "completed_by_id" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_reconciliations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_reconciliation_matches" (
    "id" TEXT NOT NULL,
    "bank_statement_line_id" TEXT NOT NULL,
    "payment_id" TEXT,
    "journal_entry_id" TEXT,
    "matched_amount" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "confidence" DECIMAL(4,3) NOT NULL DEFAULT 1.0,
    "match_type" VARCHAR(50) NOT NULL DEFAULT 'MANUAL',
    "matched_by_id" TEXT,
    "matched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_reconciliation_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_of_measures" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "precision" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unit_of_measures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_categories" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "parent_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouses" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "address" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_locations" (
    "id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "sku" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "category_id" TEXT,
    "item_type" "ItemType" NOT NULL DEFAULT 'INVENTORY',
    "unit_of_measure_id" TEXT,
    "inventory_account_id" TEXT,
    "cogs_account_id" TEXT,
    "sales_account_id" TEXT,
    "purchase_account_id" TEXT,
    "valuation_method" "ValuationMethod" NOT NULL DEFAULT 'FIFO',
    "is_inventory_tracked" BOOLEAN NOT NULL DEFAULT true,
    "reorder_level" DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
    "selling_price" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "purchase_price" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "movement_number" VARCHAR(100) NOT NULL,
    "movement_type" "StockMovementType" NOT NULL,
    "movement_date" DATE NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL,
    "unit_cost" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "total_cost" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "source_type" VARCHAR(50),
    "source_id" VARCHAR(100),
    "reference" VARCHAR(255),
    "status" "StockMovementStatus" NOT NULL DEFAULT 'DRAFT',
    "journal_entry_id" TEXT,
    "created_by_id" TEXT,
    "posted_by_id" TEXT,
    "posted_at" TIMESTAMP(3),
    "reversed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_valuation_layers" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "stock_movement_id" TEXT NOT NULL,
    "quantity_in" DECIMAL(12,4) NOT NULL,
    "quantity_remaining" DECIMAL(12,4) NOT NULL,
    "unit_cost" DECIMAL(18,4) NOT NULL,
    "total_cost" DECIMAL(18,4) NOT NULL,
    "layer_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_valuation_layers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods_receipts" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "receipt_number" VARCHAR(100) NOT NULL,
    "vendor_id" TEXT,
    "purchase_order_id" TEXT,
    "warehouse_id" TEXT NOT NULL,
    "receipt_date" DATE NOT NULL,
    "status" "GoodsReceiptStatus" NOT NULL DEFAULT 'DRAFT',
    "total_value" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "reference" VARCHAR(255),
    "notes" TEXT,
    "journal_entry_id" TEXT,
    "created_by_id" TEXT,
    "posted_by_id" TEXT,
    "posted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goods_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods_receipt_lines" (
    "id" TEXT NOT NULL,
    "goods_receipt_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "purchase_order_line_id" TEXT,
    "quantity_received" DECIMAL(12,4) NOT NULL,
    "unit_cost" DECIMAL(18,4) NOT NULL,
    "total_cost" DECIMAL(18,4) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goods_receipt_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deliveries" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "delivery_number" VARCHAR(100) NOT NULL,
    "customer_id" TEXT,
    "sales_invoice_id" TEXT,
    "warehouse_id" TEXT NOT NULL,
    "delivery_date" DATE NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'DRAFT',
    "total_cost" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "reference" VARCHAR(255),
    "notes" TEXT,
    "journal_entry_id" TEXT,
    "created_by_id" TEXT,
    "posted_by_id" TEXT,
    "posted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_lines" (
    "id" TEXT NOT NULL,
    "delivery_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "sales_invoice_line_id" TEXT,
    "quantity_delivered" DECIMAL(12,4) NOT NULL,
    "calculated_unit_cost" DECIMAL(18,4) NOT NULL,
    "calculated_total_cost" DECIMAL(18,4) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_transfers" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "transfer_number" VARCHAR(100) NOT NULL,
    "from_warehouse_id" TEXT NOT NULL,
    "to_warehouse_id" TEXT NOT NULL,
    "transfer_date" DATE NOT NULL,
    "status" "StockTransferStatus" NOT NULL DEFAULT 'DRAFT',
    "total_cost" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "reference" VARCHAR(255),
    "notes" TEXT,
    "created_by_id" TEXT,
    "posted_by_id" TEXT,
    "posted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_transfer_lines" (
    "id" TEXT NOT NULL,
    "stock_transfer_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL,
    "unit_cost" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "total_cost" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_transfer_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_adjustments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "adjustment_number" VARCHAR(100) NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "adjustment_date" DATE NOT NULL,
    "adjustment_type" "StockAdjustmentType" NOT NULL,
    "status" "StockAdjustmentStatus" NOT NULL DEFAULT 'DRAFT',
    "total_cost" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "reason" TEXT NOT NULL,
    "reference" VARCHAR(255),
    "journal_entry_id" TEXT,
    "created_by_id" TEXT,
    "posted_by_id" TEXT,
    "posted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_adjustment_lines" (
    "id" TEXT NOT NULL,
    "stock_adjustment_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL,
    "unit_cost" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "total_cost" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_adjustment_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fixed_asset_categories" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "fixed_asset_account_id" TEXT NOT NULL,
    "accumulated_depreciation_account_id" TEXT NOT NULL,
    "depreciation_expense_account_id" TEXT NOT NULL,
    "gain_on_disposal_account_id" TEXT NOT NULL,
    "loss_on_disposal_account_id" TEXT NOT NULL,
    "default_useful_life_months" INTEGER,
    "default_depreciation_method" "DepreciationMethod" NOT NULL DEFAULT 'STRAIGHT_LINE',
    "default_residual_value_percent" DECIMAL(6,4) NOT NULL DEFAULT 0.0000,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fixed_asset_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fixed_assets" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "asset_number" VARCHAR(100) NOT NULL,
    "category_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "serial_number" VARCHAR(100),
    "acquisition_date" DATE NOT NULL,
    "capitalization_date" DATE,
    "depreciation_start_date" DATE,
    "acquisition_cost" DECIMAL(18,4) NOT NULL,
    "residual_value" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "depreciable_amount" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "useful_life_months" INTEGER,
    "depreciation_method" "DepreciationMethod" NOT NULL DEFAULT 'STRAIGHT_LINE',
    "accumulated_depreciation" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "net_book_value" DECIMAL(18,4) NOT NULL,
    "status" "AssetStatus" NOT NULL DEFAULT 'DRAFT',
    "vendor_id" TEXT,
    "vendor_bill_id" TEXT,
    "vendor_bill_line_id" TEXT,
    "purchase_order_id" TEXT,
    "location" VARCHAR(255),
    "department" VARCHAR(100),
    "custodian" VARCHAR(255),
    "reference" VARCHAR(255),
    "journal_entry_id" TEXT,
    "created_by_id" TEXT,
    "capitalized_by_id" TEXT,
    "capitalized_at" TIMESTAMP(3),
    "disposed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fixed_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_depreciation_schedules" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "period_year" INTEGER NOT NULL,
    "period_month" INTEGER NOT NULL,
    "depreciation_date" DATE NOT NULL,
    "opening_book_value" DECIMAL(18,4) NOT NULL,
    "depreciation_amount" DECIMAL(18,4) NOT NULL,
    "accumulated_depreciation" DECIMAL(18,4) NOT NULL,
    "closing_book_value" DECIMAL(18,4) NOT NULL,
    "status" "DepreciationScheduleStatus" NOT NULL DEFAULT 'SCHEDULED',
    "depreciation_run_id" TEXT,
    "journal_entry_id" TEXT,
    "posted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_depreciation_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "depreciation_runs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "period_year" INTEGER NOT NULL,
    "period_month" INTEGER NOT NULL,
    "run_number" VARCHAR(100) NOT NULL,
    "status" "DepreciationRunStatus" NOT NULL DEFAULT 'DRAFT',
    "total_depreciation" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "journal_entry_id" TEXT,
    "created_by_id" TEXT,
    "posted_by_id" TEXT,
    "posted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "depreciation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_movements" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "from_location" VARCHAR(255),
    "to_location" VARCHAR(255) NOT NULL,
    "from_custodian" VARCHAR(255),
    "to_custodian" VARCHAR(255),
    "movement_date" DATE NOT NULL,
    "reason" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_disposals" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "disposal_date" DATE NOT NULL,
    "disposal_type" "DisposalType" NOT NULL,
    "proceeds" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "buyer_id" TEXT,
    "cash_bank_account_id" TEXT,
    "disposal_reference" VARCHAR(255),
    "asset_cost" DECIMAL(18,4) NOT NULL,
    "accumulated_deprec" DECIMAL(18,4) NOT NULL,
    "net_book_value" DECIMAL(18,4) NOT NULL,
    "gain_loss" DECIMAL(18,4) NOT NULL,
    "journal_entry_id" TEXT,
    "status" "DisposalStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "created_by_id" TEXT,
    "posted_by_id" TEXT,
    "posted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_disposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_impairments" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "impairment_date" DATE NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "reason" TEXT NOT NULL,
    "journal_entry_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_impairments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_codes" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "entity_id" TEXT,
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "tax_type" "TaxType" NOT NULL,
    "direction" "TaxDirection" NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_rules" (
    "id" TEXT NOT NULL,
    "tax_code_id" TEXT NOT NULL,
    "valid_from" DATE NOT NULL,
    "valid_to" DATE,
    "legal_rate" DECIMAL(8,6) NOT NULL,
    "dpp_factor" DECIMAL(8,6) NOT NULL DEFAULT 1.0,
    "calculation_method" "TaxCalculationMethod" NOT NULL DEFAULT 'PERCENT_OF_BASE',
    "rounding_method" "TaxRoundingMethod" NOT NULL DEFAULT 'ROUND_HALF_UP',
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_transactions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "tax_code_id" TEXT NOT NULL,
    "tax_rule_id" TEXT NOT NULL,
    "tax_period_id" TEXT,
    "source_type" "TaxSourceType" NOT NULL,
    "sales_invoice_id" TEXT,
    "vendor_bill_id" TEXT,
    "payment_id" TEXT,
    "transaction_date" DATE NOT NULL,
    "base_amount" DECIMAL(18,4) NOT NULL,
    "dpp_amount" DECIMAL(18,4) NOT NULL,
    "tax_amount" DECIMAL(18,4) NOT NULL,
    "legal_rate" DECIMAL(8,6) NOT NULL,
    "dpp_factor" DECIMAL(8,6) NOT NULL DEFAULT 1.0,
    "direction" "TaxDirection" NOT NULL,
    "status" "TaxTransactionStatus" NOT NULL DEFAULT 'DRAFT',
    "journal_entry_id" TEXT,
    "reversed_by_id" TEXT,
    "reversal_of_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_periods" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "tax_type" "TaxType" NOT NULL,
    "period_year" INTEGER NOT NULL,
    "period_month" INTEGER NOT NULL,
    "status" "TaxPeriodStatus" NOT NULL DEFAULT 'OPEN',
    "total_output_tax" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "total_input_tax" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "total_withholding_payable" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "total_withholding_receivable" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "net_tax" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "total_paid" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "filing_deadline" DATE,
    "filed_at" TIMESTAMP(3),
    "filed_by_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_documents" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "tax_period_id" TEXT,
    "tax_code_id" TEXT,
    "tax_transaction_id" TEXT,
    "document_type" "TaxDocumentType" NOT NULL,
    "document_number" VARCHAR(100),
    "issue_date" DATE,
    "counterparty_name" VARCHAR(255),
    "counterparty_npwp" VARCHAR(30),
    "taxable_base" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "tax_amount" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "status" "TaxDocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "replaced_by_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_payments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "tax_period_id" TEXT NOT NULL,
    "payment_number" VARCHAR(100) NOT NULL,
    "payment_date" DATE NOT NULL,
    "tax_type" "TaxType" NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "ntpn" VARCHAR(50),
    "ssp_number" VARCHAR(50),
    "cash_bank_account_id" TEXT NOT NULL,
    "journal_entry_id" TEXT,
    "status" "TaxPaymentStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "created_by_id" TEXT,
    "posted_by_id" TEXT,
    "posted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withholding_evidences" (
    "id" TEXT NOT NULL,
    "tax_transaction_id" TEXT NOT NULL,
    "certificate_number" VARCHAR(100),
    "issue_date" DATE,
    "counterparty_name" VARCHAR(255),
    "counterparty_npwp" VARCHAR(30),
    "status" "WithholdingEvidenceStatus" NOT NULL DEFAULT 'PENDING_DOCUMENT',
    "document_url" TEXT,
    "received_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "withholding_evidences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_adjustments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "tax_period_id" TEXT,
    "adjustment_date" DATE NOT NULL,
    "tax_type" "TaxType" NOT NULL,
    "direction" "TaxDirection" NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "reason" TEXT NOT NULL,
    "journal_entry_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "period" VARCHAR(20) NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "notes" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "code" VARCHAR(50),
    "name" VARCHAR(255) NOT NULL,
    "customer" VARCHAR(255),
    "budget" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "spent" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "progress" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "status" VARCHAR(50) NOT NULL DEFAULT 'In Progress',
    "profitability" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "start_date" DATE,
    "end_date" DATE,
    "description" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_employees" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "employee_code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "position" VARCHAR(100) NOT NULL,
    "base_salary" DECIMAL(18,4) NOT NULL,
    "allowances" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "deductions" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_runs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "pay_period" VARCHAR(50) NOT NULL,
    "run_date" DATE NOT NULL,
    "total_gross" DECIMAL(18,4) NOT NULL,
    "total_taxes" DECIMAL(18,4) NOT NULL,
    "total_net" DECIMAL(18,4) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'Completed',
    "employee_count" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "plan_code" VARCHAR(50) NOT NULL DEFAULT 'PRO',
    "status" VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    "start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_date" TIMESTAMP(3),
    "auto_renew" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "language" VARCHAR(10) NOT NULL DEFAULT 'id',
    "theme" VARCHAR(20) NOT NULL DEFAULT 'light',
    "timezone" VARCHAR(100) NOT NULL DEFAULT 'Asia/Jakarta',
    "enabled_modules" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "organization_members_organization_id_idx" ON "organization_members"("organization_id");

-- CreateIndex
CREATE INDEX "organization_members_user_id_idx" ON "organization_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "organization_members_organization_id_user_id_key" ON "organization_members"("organization_id", "user_id");

-- CreateIndex
CREATE INDEX "entities_organization_id_idx" ON "entities"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "entities_organization_id_code_key" ON "entities"("organization_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_token_hash_idx" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "audit_logs_organization_id_idx" ON "audit_logs"("organization_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "accounts_organization_id_idx" ON "accounts"("organization_id");

-- CreateIndex
CREATE INDEX "accounts_entity_id_idx" ON "accounts"("entity_id");

-- CreateIndex
CREATE INDEX "accounts_type_idx" ON "accounts"("type");

-- CreateIndex
CREATE INDEX "accounts_code_idx" ON "accounts"("code");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_entity_id_code_key" ON "accounts"("entity_id", "code");

-- CreateIndex
CREATE INDEX "journal_entries_organization_id_idx" ON "journal_entries"("organization_id");

-- CreateIndex
CREATE INDEX "journal_entries_entity_id_idx" ON "journal_entries"("entity_id");

-- CreateIndex
CREATE INDEX "journal_entries_entry_date_idx" ON "journal_entries"("entry_date");

-- CreateIndex
CREATE INDEX "journal_entries_status_idx" ON "journal_entries"("status");

-- CreateIndex
CREATE UNIQUE INDEX "journal_entries_entity_id_entry_number_key" ON "journal_entries"("entity_id", "entry_number");

-- CreateIndex
CREATE INDEX "journal_lines_journal_entry_id_idx" ON "journal_lines"("journal_entry_id");

-- CreateIndex
CREATE INDEX "journal_lines_account_id_idx" ON "journal_lines"("account_id");

-- CreateIndex
CREATE UNIQUE INDEX "accounting_settings_entity_id_key" ON "accounting_settings"("entity_id");

-- CreateIndex
CREATE INDEX "accounting_settings_organization_id_idx" ON "accounting_settings"("organization_id");

-- CreateIndex
CREATE INDEX "customers_organization_id_idx" ON "customers"("organization_id");

-- CreateIndex
CREATE INDEX "customers_entity_id_idx" ON "customers"("entity_id");

-- CreateIndex
CREATE INDEX "customers_name_idx" ON "customers"("name");

-- CreateIndex
CREATE INDEX "customers_is_active_idx" ON "customers"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "customers_entity_id_customer_code_key" ON "customers"("entity_id", "customer_code");

-- CreateIndex
CREATE INDEX "sales_invoices_organization_id_idx" ON "sales_invoices"("organization_id");

-- CreateIndex
CREATE INDEX "sales_invoices_entity_id_idx" ON "sales_invoices"("entity_id");

-- CreateIndex
CREATE INDEX "sales_invoices_customer_id_idx" ON "sales_invoices"("customer_id");

-- CreateIndex
CREATE INDEX "sales_invoices_invoice_date_idx" ON "sales_invoices"("invoice_date");

-- CreateIndex
CREATE INDEX "sales_invoices_due_date_idx" ON "sales_invoices"("due_date");

-- CreateIndex
CREATE INDEX "sales_invoices_status_idx" ON "sales_invoices"("status");

-- CreateIndex
CREATE INDEX "sales_invoices_posting_status_idx" ON "sales_invoices"("posting_status");

-- CreateIndex
CREATE UNIQUE INDEX "sales_invoices_entity_id_invoice_number_key" ON "sales_invoices"("entity_id", "invoice_number");

-- CreateIndex
CREATE INDEX "sales_invoice_lines_sales_invoice_id_idx" ON "sales_invoice_lines"("sales_invoice_id");

-- CreateIndex
CREATE INDEX "sales_invoice_lines_revenue_account_id_idx" ON "sales_invoice_lines"("revenue_account_id");

-- CreateIndex
CREATE INDEX "sales_invoice_lines_item_id_idx" ON "sales_invoice_lines"("item_id");

-- CreateIndex
CREATE INDEX "sales_invoice_lines_tax_code_id_idx" ON "sales_invoice_lines"("tax_code_id");

-- CreateIndex
CREATE INDEX "vendors_organization_id_idx" ON "vendors"("organization_id");

-- CreateIndex
CREATE INDEX "vendors_entity_id_idx" ON "vendors"("entity_id");

-- CreateIndex
CREATE INDEX "vendors_name_idx" ON "vendors"("name");

-- CreateIndex
CREATE INDEX "vendors_is_active_idx" ON "vendors"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_entity_id_vendor_code_key" ON "vendors"("entity_id", "vendor_code");

-- CreateIndex
CREATE INDEX "purchase_orders_organization_id_idx" ON "purchase_orders"("organization_id");

-- CreateIndex
CREATE INDEX "purchase_orders_entity_id_idx" ON "purchase_orders"("entity_id");

-- CreateIndex
CREATE INDEX "purchase_orders_vendor_id_idx" ON "purchase_orders"("vendor_id");

-- CreateIndex
CREATE INDEX "purchase_orders_order_date_idx" ON "purchase_orders"("order_date");

-- CreateIndex
CREATE INDEX "purchase_orders_status_idx" ON "purchase_orders"("status");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_entity_id_po_number_key" ON "purchase_orders"("entity_id", "po_number");

-- CreateIndex
CREATE INDEX "purchase_order_lines_purchase_order_id_idx" ON "purchase_order_lines"("purchase_order_id");

-- CreateIndex
CREATE INDEX "purchase_order_lines_expense_account_id_idx" ON "purchase_order_lines"("expense_account_id");

-- CreateIndex
CREATE INDEX "purchase_order_lines_item_id_idx" ON "purchase_order_lines"("item_id");

-- CreateIndex
CREATE INDEX "vendor_bills_organization_id_idx" ON "vendor_bills"("organization_id");

-- CreateIndex
CREATE INDEX "vendor_bills_entity_id_idx" ON "vendor_bills"("entity_id");

-- CreateIndex
CREATE INDEX "vendor_bills_vendor_id_idx" ON "vendor_bills"("vendor_id");

-- CreateIndex
CREATE INDEX "vendor_bills_purchase_order_id_idx" ON "vendor_bills"("purchase_order_id");

-- CreateIndex
CREATE INDEX "vendor_bills_bill_date_idx" ON "vendor_bills"("bill_date");

-- CreateIndex
CREATE INDEX "vendor_bills_due_date_idx" ON "vendor_bills"("due_date");

-- CreateIndex
CREATE INDEX "vendor_bills_status_idx" ON "vendor_bills"("status");

-- CreateIndex
CREATE INDEX "vendor_bills_posting_status_idx" ON "vendor_bills"("posting_status");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_bills_entity_id_bill_number_key" ON "vendor_bills"("entity_id", "bill_number");

-- CreateIndex
CREATE INDEX "vendor_bill_lines_vendor_bill_id_idx" ON "vendor_bill_lines"("vendor_bill_id");

-- CreateIndex
CREATE INDEX "vendor_bill_lines_expense_account_id_idx" ON "vendor_bill_lines"("expense_account_id");

-- CreateIndex
CREATE INDEX "vendor_bill_lines_item_id_idx" ON "vendor_bill_lines"("item_id");

-- CreateIndex
CREATE INDEX "vendor_bill_lines_asset_category_id_idx" ON "vendor_bill_lines"("asset_category_id");

-- CreateIndex
CREATE INDEX "vendor_bill_lines_goods_receipt_line_id_idx" ON "vendor_bill_lines"("goods_receipt_line_id");

-- CreateIndex
CREATE INDEX "vendor_bill_lines_tax_code_id_idx" ON "vendor_bill_lines"("tax_code_id");

-- CreateIndex
CREATE INDEX "cash_bank_accounts_organization_id_idx" ON "cash_bank_accounts"("organization_id");

-- CreateIndex
CREATE INDEX "cash_bank_accounts_entity_id_idx" ON "cash_bank_accounts"("entity_id");

-- CreateIndex
CREATE INDEX "cash_bank_accounts_coa_account_id_idx" ON "cash_bank_accounts"("coa_account_id");

-- CreateIndex
CREATE INDEX "cash_bank_accounts_is_active_idx" ON "cash_bank_accounts"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "cash_bank_accounts_entity_id_code_key" ON "cash_bank_accounts"("entity_id", "code");

-- CreateIndex
CREATE INDEX "payments_organization_id_idx" ON "payments"("organization_id");

-- CreateIndex
CREATE INDEX "payments_entity_id_idx" ON "payments"("entity_id");

-- CreateIndex
CREATE INDEX "payments_payment_number_idx" ON "payments"("payment_number");

-- CreateIndex
CREATE INDEX "payments_type_idx" ON "payments"("type");

-- CreateIndex
CREATE INDEX "payments_direction_idx" ON "payments"("direction");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_payment_date_idx" ON "payments"("payment_date");

-- CreateIndex
CREATE INDEX "payments_customer_id_idx" ON "payments"("customer_id");

-- CreateIndex
CREATE INDEX "payments_vendor_id_idx" ON "payments"("vendor_id");

-- CreateIndex
CREATE INDEX "payments_cash_bank_account_id_idx" ON "payments"("cash_bank_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_entity_id_payment_number_key" ON "payments"("entity_id", "payment_number");

-- CreateIndex
CREATE INDEX "payment_allocations_payment_id_idx" ON "payment_allocations"("payment_id");

-- CreateIndex
CREATE INDEX "payment_allocations_sales_invoice_id_idx" ON "payment_allocations"("sales_invoice_id");

-- CreateIndex
CREATE INDEX "payment_allocations_vendor_bill_id_idx" ON "payment_allocations"("vendor_bill_id");

-- CreateIndex
CREATE INDEX "bank_statement_imports_organization_id_idx" ON "bank_statement_imports"("organization_id");

-- CreateIndex
CREATE INDEX "bank_statement_imports_entity_id_idx" ON "bank_statement_imports"("entity_id");

-- CreateIndex
CREATE INDEX "bank_statement_imports_cash_bank_account_id_idx" ON "bank_statement_imports"("cash_bank_account_id");

-- CreateIndex
CREATE INDEX "bank_statement_imports_statement_start_date_idx" ON "bank_statement_imports"("statement_start_date");

-- CreateIndex
CREATE INDEX "bank_statement_imports_statement_end_date_idx" ON "bank_statement_imports"("statement_end_date");

-- CreateIndex
CREATE INDEX "bank_statement_lines_bank_statement_import_id_idx" ON "bank_statement_lines"("bank_statement_import_id");

-- CreateIndex
CREATE INDEX "bank_statement_lines_transaction_date_idx" ON "bank_statement_lines"("transaction_date");

-- CreateIndex
CREATE INDEX "bank_statement_lines_external_transaction_id_idx" ON "bank_statement_lines"("external_transaction_id");

-- CreateIndex
CREATE INDEX "bank_statement_lines_normalized_hash_idx" ON "bank_statement_lines"("normalized_hash");

-- CreateIndex
CREATE INDEX "bank_statement_lines_reconciliation_status_idx" ON "bank_statement_lines"("reconciliation_status");

-- CreateIndex
CREATE INDEX "bank_reconciliations_organization_id_idx" ON "bank_reconciliations"("organization_id");

-- CreateIndex
CREATE INDEX "bank_reconciliations_entity_id_idx" ON "bank_reconciliations"("entity_id");

-- CreateIndex
CREATE INDEX "bank_reconciliations_cash_bank_account_id_idx" ON "bank_reconciliations"("cash_bank_account_id");

-- CreateIndex
CREATE INDEX "bank_reconciliations_period_start_idx" ON "bank_reconciliations"("period_start");

-- CreateIndex
CREATE INDEX "bank_reconciliations_period_end_idx" ON "bank_reconciliations"("period_end");

-- CreateIndex
CREATE INDEX "bank_reconciliations_status_idx" ON "bank_reconciliations"("status");

-- CreateIndex
CREATE INDEX "bank_reconciliation_matches_bank_statement_line_id_idx" ON "bank_reconciliation_matches"("bank_statement_line_id");

-- CreateIndex
CREATE INDEX "bank_reconciliation_matches_payment_id_idx" ON "bank_reconciliation_matches"("payment_id");

-- CreateIndex
CREATE INDEX "bank_reconciliation_matches_journal_entry_id_idx" ON "bank_reconciliation_matches"("journal_entry_id");

-- CreateIndex
CREATE INDEX "unit_of_measures_organization_id_idx" ON "unit_of_measures"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "unit_of_measures_organization_id_code_key" ON "unit_of_measures"("organization_id", "code");

-- CreateIndex
CREATE INDEX "inventory_categories_organization_id_idx" ON "inventory_categories"("organization_id");

-- CreateIndex
CREATE INDEX "inventory_categories_entity_id_idx" ON "inventory_categories"("entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_categories_entity_id_code_key" ON "inventory_categories"("entity_id", "code");

-- CreateIndex
CREATE INDEX "warehouses_organization_id_idx" ON "warehouses"("organization_id");

-- CreateIndex
CREATE INDEX "warehouses_entity_id_idx" ON "warehouses"("entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_entity_id_code_key" ON "warehouses"("entity_id", "code");

-- CreateIndex
CREATE INDEX "stock_locations_warehouse_id_idx" ON "stock_locations"("warehouse_id");

-- CreateIndex
CREATE UNIQUE INDEX "stock_locations_warehouse_id_code_key" ON "stock_locations"("warehouse_id", "code");

-- CreateIndex
CREATE INDEX "inventory_items_organization_id_idx" ON "inventory_items"("organization_id");

-- CreateIndex
CREATE INDEX "inventory_items_entity_id_idx" ON "inventory_items"("entity_id");

-- CreateIndex
CREATE INDEX "inventory_items_sku_idx" ON "inventory_items"("sku");

-- CreateIndex
CREATE INDEX "inventory_items_category_id_idx" ON "inventory_items"("category_id");

-- CreateIndex
CREATE INDEX "inventory_items_is_active_idx" ON "inventory_items"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_entity_id_sku_key" ON "inventory_items"("entity_id", "sku");

-- CreateIndex
CREATE INDEX "stock_movements_organization_id_idx" ON "stock_movements"("organization_id");

-- CreateIndex
CREATE INDEX "stock_movements_entity_id_idx" ON "stock_movements"("entity_id");

-- CreateIndex
CREATE INDEX "stock_movements_item_id_idx" ON "stock_movements"("item_id");

-- CreateIndex
CREATE INDEX "stock_movements_warehouse_id_idx" ON "stock_movements"("warehouse_id");

-- CreateIndex
CREATE INDEX "stock_movements_movement_date_idx" ON "stock_movements"("movement_date");

-- CreateIndex
CREATE INDEX "stock_movements_movement_type_idx" ON "stock_movements"("movement_type");

-- CreateIndex
CREATE INDEX "stock_movements_status_idx" ON "stock_movements"("status");

-- CreateIndex
CREATE UNIQUE INDEX "stock_movements_entity_id_movement_number_key" ON "stock_movements"("entity_id", "movement_number");

-- CreateIndex
CREATE INDEX "inventory_valuation_layers_organization_id_idx" ON "inventory_valuation_layers"("organization_id");

-- CreateIndex
CREATE INDEX "inventory_valuation_layers_entity_id_idx" ON "inventory_valuation_layers"("entity_id");

-- CreateIndex
CREATE INDEX "inventory_valuation_layers_item_id_idx" ON "inventory_valuation_layers"("item_id");

-- CreateIndex
CREATE INDEX "inventory_valuation_layers_warehouse_id_idx" ON "inventory_valuation_layers"("warehouse_id");

-- CreateIndex
CREATE INDEX "inventory_valuation_layers_layer_date_idx" ON "inventory_valuation_layers"("layer_date");

-- CreateIndex
CREATE INDEX "inventory_valuation_layers_quantity_remaining_idx" ON "inventory_valuation_layers"("quantity_remaining");

-- CreateIndex
CREATE INDEX "goods_receipts_organization_id_idx" ON "goods_receipts"("organization_id");

-- CreateIndex
CREATE INDEX "goods_receipts_entity_id_idx" ON "goods_receipts"("entity_id");

-- CreateIndex
CREATE INDEX "goods_receipts_purchase_order_id_idx" ON "goods_receipts"("purchase_order_id");

-- CreateIndex
CREATE INDEX "goods_receipts_warehouse_id_idx" ON "goods_receipts"("warehouse_id");

-- CreateIndex
CREATE INDEX "goods_receipts_receipt_date_idx" ON "goods_receipts"("receipt_date");

-- CreateIndex
CREATE INDEX "goods_receipts_status_idx" ON "goods_receipts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "goods_receipts_entity_id_receipt_number_key" ON "goods_receipts"("entity_id", "receipt_number");

-- CreateIndex
CREATE INDEX "goods_receipt_lines_goods_receipt_id_idx" ON "goods_receipt_lines"("goods_receipt_id");

-- CreateIndex
CREATE INDEX "goods_receipt_lines_item_id_idx" ON "goods_receipt_lines"("item_id");

-- CreateIndex
CREATE INDEX "goods_receipt_lines_purchase_order_line_id_idx" ON "goods_receipt_lines"("purchase_order_line_id");

-- CreateIndex
CREATE INDEX "deliveries_organization_id_idx" ON "deliveries"("organization_id");

-- CreateIndex
CREATE INDEX "deliveries_entity_id_idx" ON "deliveries"("entity_id");

-- CreateIndex
CREATE INDEX "deliveries_sales_invoice_id_idx" ON "deliveries"("sales_invoice_id");

-- CreateIndex
CREATE INDEX "deliveries_warehouse_id_idx" ON "deliveries"("warehouse_id");

-- CreateIndex
CREATE INDEX "deliveries_delivery_date_idx" ON "deliveries"("delivery_date");

-- CreateIndex
CREATE INDEX "deliveries_status_idx" ON "deliveries"("status");

-- CreateIndex
CREATE UNIQUE INDEX "deliveries_entity_id_delivery_number_key" ON "deliveries"("entity_id", "delivery_number");

-- CreateIndex
CREATE INDEX "delivery_lines_delivery_id_idx" ON "delivery_lines"("delivery_id");

-- CreateIndex
CREATE INDEX "delivery_lines_item_id_idx" ON "delivery_lines"("item_id");

-- CreateIndex
CREATE INDEX "delivery_lines_sales_invoice_line_id_idx" ON "delivery_lines"("sales_invoice_line_id");

-- CreateIndex
CREATE INDEX "stock_transfers_organization_id_idx" ON "stock_transfers"("organization_id");

-- CreateIndex
CREATE INDEX "stock_transfers_entity_id_idx" ON "stock_transfers"("entity_id");

-- CreateIndex
CREATE INDEX "stock_transfers_from_warehouse_id_idx" ON "stock_transfers"("from_warehouse_id");

-- CreateIndex
CREATE INDEX "stock_transfers_to_warehouse_id_idx" ON "stock_transfers"("to_warehouse_id");

-- CreateIndex
CREATE INDEX "stock_transfers_status_idx" ON "stock_transfers"("status");

-- CreateIndex
CREATE UNIQUE INDEX "stock_transfers_entity_id_transfer_number_key" ON "stock_transfers"("entity_id", "transfer_number");

-- CreateIndex
CREATE INDEX "stock_transfer_lines_stock_transfer_id_idx" ON "stock_transfer_lines"("stock_transfer_id");

-- CreateIndex
CREATE INDEX "stock_transfer_lines_item_id_idx" ON "stock_transfer_lines"("item_id");

-- CreateIndex
CREATE INDEX "stock_adjustments_organization_id_idx" ON "stock_adjustments"("organization_id");

-- CreateIndex
CREATE INDEX "stock_adjustments_entity_id_idx" ON "stock_adjustments"("entity_id");

-- CreateIndex
CREATE INDEX "stock_adjustments_warehouse_id_idx" ON "stock_adjustments"("warehouse_id");

-- CreateIndex
CREATE INDEX "stock_adjustments_adjustment_date_idx" ON "stock_adjustments"("adjustment_date");

-- CreateIndex
CREATE INDEX "stock_adjustments_status_idx" ON "stock_adjustments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "stock_adjustments_entity_id_adjustment_number_key" ON "stock_adjustments"("entity_id", "adjustment_number");

-- CreateIndex
CREATE INDEX "stock_adjustment_lines_stock_adjustment_id_idx" ON "stock_adjustment_lines"("stock_adjustment_id");

-- CreateIndex
CREATE INDEX "stock_adjustment_lines_item_id_idx" ON "stock_adjustment_lines"("item_id");

-- CreateIndex
CREATE INDEX "fixed_asset_categories_organization_id_idx" ON "fixed_asset_categories"("organization_id");

-- CreateIndex
CREATE INDEX "fixed_asset_categories_entity_id_idx" ON "fixed_asset_categories"("entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "fixed_asset_categories_entity_id_code_key" ON "fixed_asset_categories"("entity_id", "code");

-- CreateIndex
CREATE INDEX "fixed_assets_organization_id_idx" ON "fixed_assets"("organization_id");

-- CreateIndex
CREATE INDEX "fixed_assets_entity_id_idx" ON "fixed_assets"("entity_id");

-- CreateIndex
CREATE INDEX "fixed_assets_asset_number_idx" ON "fixed_assets"("asset_number");

-- CreateIndex
CREATE INDEX "fixed_assets_category_id_idx" ON "fixed_assets"("category_id");

-- CreateIndex
CREATE INDEX "fixed_assets_status_idx" ON "fixed_assets"("status");

-- CreateIndex
CREATE INDEX "fixed_assets_capitalization_date_idx" ON "fixed_assets"("capitalization_date");

-- CreateIndex
CREATE UNIQUE INDEX "fixed_assets_entity_id_asset_number_key" ON "fixed_assets"("entity_id", "asset_number");

-- CreateIndex
CREATE INDEX "asset_depreciation_schedules_asset_id_idx" ON "asset_depreciation_schedules"("asset_id");

-- CreateIndex
CREATE INDEX "asset_depreciation_schedules_period_year_period_month_idx" ON "asset_depreciation_schedules"("period_year", "period_month");

-- CreateIndex
CREATE INDEX "asset_depreciation_schedules_status_idx" ON "asset_depreciation_schedules"("status");

-- CreateIndex
CREATE UNIQUE INDEX "asset_depreciation_schedules_asset_id_period_year_period_mo_key" ON "asset_depreciation_schedules"("asset_id", "period_year", "period_month");

-- CreateIndex
CREATE INDEX "depreciation_runs_organization_id_idx" ON "depreciation_runs"("organization_id");

-- CreateIndex
CREATE INDEX "depreciation_runs_entity_id_idx" ON "depreciation_runs"("entity_id");

-- CreateIndex
CREATE INDEX "depreciation_runs_period_year_period_month_idx" ON "depreciation_runs"("period_year", "period_month");

-- CreateIndex
CREATE INDEX "depreciation_runs_status_idx" ON "depreciation_runs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "depreciation_runs_entity_id_period_year_period_month_key" ON "depreciation_runs"("entity_id", "period_year", "period_month");

-- CreateIndex
CREATE UNIQUE INDEX "depreciation_runs_entity_id_run_number_key" ON "depreciation_runs"("entity_id", "run_number");

-- CreateIndex
CREATE INDEX "asset_movements_asset_id_idx" ON "asset_movements"("asset_id");

-- CreateIndex
CREATE INDEX "asset_movements_movement_date_idx" ON "asset_movements"("movement_date");

-- CreateIndex
CREATE INDEX "asset_disposals_organization_id_idx" ON "asset_disposals"("organization_id");

-- CreateIndex
CREATE INDEX "asset_disposals_entity_id_idx" ON "asset_disposals"("entity_id");

-- CreateIndex
CREATE INDEX "asset_disposals_asset_id_idx" ON "asset_disposals"("asset_id");

-- CreateIndex
CREATE INDEX "asset_disposals_disposal_date_idx" ON "asset_disposals"("disposal_date");

-- CreateIndex
CREATE INDEX "asset_disposals_status_idx" ON "asset_disposals"("status");

-- CreateIndex
CREATE INDEX "asset_impairments_asset_id_idx" ON "asset_impairments"("asset_id");

-- CreateIndex
CREATE INDEX "asset_impairments_impairment_date_idx" ON "asset_impairments"("impairment_date");

-- CreateIndex
CREATE INDEX "tax_codes_organization_id_idx" ON "tax_codes"("organization_id");

-- CreateIndex
CREATE INDEX "tax_codes_entity_id_idx" ON "tax_codes"("entity_id");

-- CreateIndex
CREATE INDEX "tax_codes_tax_type_idx" ON "tax_codes"("tax_type");

-- CreateIndex
CREATE INDEX "tax_codes_direction_idx" ON "tax_codes"("direction");

-- CreateIndex
CREATE INDEX "tax_codes_is_active_idx" ON "tax_codes"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "tax_codes_organization_id_code_key" ON "tax_codes"("organization_id", "code");

-- CreateIndex
CREATE INDEX "tax_rules_tax_code_id_idx" ON "tax_rules"("tax_code_id");

-- CreateIndex
CREATE INDEX "tax_rules_valid_from_idx" ON "tax_rules"("valid_from");

-- CreateIndex
CREATE INDEX "tax_rules_valid_to_idx" ON "tax_rules"("valid_to");

-- CreateIndex
CREATE INDEX "tax_rules_is_active_idx" ON "tax_rules"("is_active");

-- CreateIndex
CREATE INDEX "tax_transactions_organization_id_idx" ON "tax_transactions"("organization_id");

-- CreateIndex
CREATE INDEX "tax_transactions_entity_id_idx" ON "tax_transactions"("entity_id");

-- CreateIndex
CREATE INDEX "tax_transactions_tax_code_id_idx" ON "tax_transactions"("tax_code_id");

-- CreateIndex
CREATE INDEX "tax_transactions_tax_period_id_idx" ON "tax_transactions"("tax_period_id");

-- CreateIndex
CREATE INDEX "tax_transactions_sales_invoice_id_idx" ON "tax_transactions"("sales_invoice_id");

-- CreateIndex
CREATE INDEX "tax_transactions_vendor_bill_id_idx" ON "tax_transactions"("vendor_bill_id");

-- CreateIndex
CREATE INDEX "tax_transactions_payment_id_idx" ON "tax_transactions"("payment_id");

-- CreateIndex
CREATE INDEX "tax_transactions_transaction_date_idx" ON "tax_transactions"("transaction_date");

-- CreateIndex
CREATE INDEX "tax_transactions_direction_idx" ON "tax_transactions"("direction");

-- CreateIndex
CREATE INDEX "tax_transactions_status_idx" ON "tax_transactions"("status");

-- CreateIndex
CREATE INDEX "tax_periods_organization_id_idx" ON "tax_periods"("organization_id");

-- CreateIndex
CREATE INDEX "tax_periods_entity_id_idx" ON "tax_periods"("entity_id");

-- CreateIndex
CREATE INDEX "tax_periods_tax_type_idx" ON "tax_periods"("tax_type");

-- CreateIndex
CREATE INDEX "tax_periods_period_year_period_month_idx" ON "tax_periods"("period_year", "period_month");

-- CreateIndex
CREATE INDEX "tax_periods_status_idx" ON "tax_periods"("status");

-- CreateIndex
CREATE UNIQUE INDEX "tax_periods_entity_id_tax_type_period_year_period_month_key" ON "tax_periods"("entity_id", "tax_type", "period_year", "period_month");

-- CreateIndex
CREATE INDEX "tax_documents_organization_id_idx" ON "tax_documents"("organization_id");

-- CreateIndex
CREATE INDEX "tax_documents_entity_id_idx" ON "tax_documents"("entity_id");

-- CreateIndex
CREATE INDEX "tax_documents_tax_period_id_idx" ON "tax_documents"("tax_period_id");

-- CreateIndex
CREATE INDEX "tax_documents_tax_code_id_idx" ON "tax_documents"("tax_code_id");

-- CreateIndex
CREATE INDEX "tax_documents_tax_transaction_id_idx" ON "tax_documents"("tax_transaction_id");

-- CreateIndex
CREATE INDEX "tax_documents_document_type_idx" ON "tax_documents"("document_type");

-- CreateIndex
CREATE INDEX "tax_documents_status_idx" ON "tax_documents"("status");

-- CreateIndex
CREATE INDEX "tax_payments_organization_id_idx" ON "tax_payments"("organization_id");

-- CreateIndex
CREATE INDEX "tax_payments_entity_id_idx" ON "tax_payments"("entity_id");

-- CreateIndex
CREATE INDEX "tax_payments_tax_period_id_idx" ON "tax_payments"("tax_period_id");

-- CreateIndex
CREATE INDEX "tax_payments_tax_type_idx" ON "tax_payments"("tax_type");

-- CreateIndex
CREATE INDEX "tax_payments_status_idx" ON "tax_payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "tax_payments_entity_id_payment_number_key" ON "tax_payments"("entity_id", "payment_number");

-- CreateIndex
CREATE UNIQUE INDEX "withholding_evidences_tax_transaction_id_key" ON "withholding_evidences"("tax_transaction_id");

-- CreateIndex
CREATE INDEX "withholding_evidences_tax_transaction_id_idx" ON "withholding_evidences"("tax_transaction_id");

-- CreateIndex
CREATE INDEX "withholding_evidences_status_idx" ON "withholding_evidences"("status");

-- CreateIndex
CREATE INDEX "tax_adjustments_organization_id_idx" ON "tax_adjustments"("organization_id");

-- CreateIndex
CREATE INDEX "tax_adjustments_entity_id_idx" ON "tax_adjustments"("entity_id");

-- CreateIndex
CREATE INDEX "tax_adjustments_tax_period_id_idx" ON "tax_adjustments"("tax_period_id");

-- CreateIndex
CREATE INDEX "tax_adjustments_adjustment_date_idx" ON "tax_adjustments"("adjustment_date");

-- CreateIndex
CREATE INDEX "budgets_organization_id_idx" ON "budgets"("organization_id");

-- CreateIndex
CREATE INDEX "budgets_entity_id_idx" ON "budgets"("entity_id");

-- CreateIndex
CREATE INDEX "budgets_period_idx" ON "budgets"("period");

-- CreateIndex
CREATE UNIQUE INDEX "budgets_entity_id_account_id_period_key" ON "budgets"("entity_id", "account_id", "period");

-- CreateIndex
CREATE INDEX "projects_organization_id_idx" ON "projects"("organization_id");

-- CreateIndex
CREATE INDEX "projects_entity_id_idx" ON "projects"("entity_id");

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- CreateIndex
CREATE INDEX "payroll_employees_organization_id_idx" ON "payroll_employees"("organization_id");

-- CreateIndex
CREATE INDEX "payroll_employees_entity_id_idx" ON "payroll_employees"("entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_employees_entity_id_employee_code_key" ON "payroll_employees"("entity_id", "employee_code");

-- CreateIndex
CREATE INDEX "payroll_runs_organization_id_idx" ON "payroll_runs"("organization_id");

-- CreateIndex
CREATE INDEX "payroll_runs_entity_id_idx" ON "payroll_runs"("entity_id");

-- CreateIndex
CREATE INDEX "payroll_runs_pay_period_idx" ON "payroll_runs"("pay_period");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_organization_id_key" ON "subscriptions"("organization_id");

-- CreateIndex
CREATE INDEX "subscriptions_organization_id_idx" ON "subscriptions"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_user_id_key" ON "user_settings"("user_id");

-- CreateIndex
CREATE INDEX "user_settings_user_id_idx" ON "user_settings"("user_id");

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entities" ADD CONSTRAINT "entities_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_posted_by_id_fkey" FOREIGN KEY ("posted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_settings" ADD CONSTRAINT "accounting_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_settings" ADD CONSTRAINT "accounting_settings_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_settings" ADD CONSTRAINT "accounting_settings_ar_account_id_fkey" FOREIGN KEY ("ar_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_settings" ADD CONSTRAINT "accounting_settings_default_revenue_account_id_fkey" FOREIGN KEY ("default_revenue_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_settings" ADD CONSTRAINT "accounting_settings_output_tax_account_id_fkey" FOREIGN KEY ("output_tax_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_settings" ADD CONSTRAINT "accounting_settings_ap_account_id_fkey" FOREIGN KEY ("ap_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_settings" ADD CONSTRAINT "accounting_settings_input_tax_account_id_fkey" FOREIGN KEY ("input_tax_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_settings" ADD CONSTRAINT "accounting_settings_default_expense_account_id_fkey" FOREIGN KEY ("default_expense_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_settings" ADD CONSTRAINT "accounting_settings_retained_earnings_account_id_fkey" FOREIGN KEY ("retained_earnings_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_settings" ADD CONSTRAINT "accounting_settings_customer_advance_account_id_fkey" FOREIGN KEY ("customer_advance_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_settings" ADD CONSTRAINT "accounting_settings_vendor_advance_account_id_fkey" FOREIGN KEY ("vendor_advance_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_settings" ADD CONSTRAINT "accounting_settings_bank_fee_expense_account_id_fkey" FOREIGN KEY ("bank_fee_expense_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_settings" ADD CONSTRAINT "accounting_settings_bank_interest_income_account_id_fkey" FOREIGN KEY ("bank_interest_income_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_settings" ADD CONSTRAINT "accounting_settings_bank_suspense_account_id_fkey" FOREIGN KEY ("bank_suspense_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_settings" ADD CONSTRAINT "accounting_settings_inventory_account_id_fkey" FOREIGN KEY ("inventory_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_settings" ADD CONSTRAINT "accounting_settings_cogs_account_id_fkey" FOREIGN KEY ("cogs_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_settings" ADD CONSTRAINT "accounting_settings_grni_account_id_fkey" FOREIGN KEY ("grni_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_settings" ADD CONSTRAINT "accounting_settings_inventory_adjustment_account_id_fkey" FOREIGN KEY ("inventory_adjustment_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_settings" ADD CONSTRAINT "accounting_settings_inventory_adjustment_gain_account_id_fkey" FOREIGN KEY ("inventory_adjustment_gain_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_settings" ADD CONSTRAINT "accounting_settings_vat_payable_account_id_fkey" FOREIGN KEY ("vat_payable_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_settings" ADD CONSTRAINT "accounting_settings_pph23_payable_account_id_fkey" FOREIGN KEY ("pph23_payable_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_settings" ADD CONSTRAINT "accounting_settings_pph23_receivable_account_id_fkey" FOREIGN KEY ("pph23_receivable_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_settings" ADD CONSTRAINT "accounting_settings_pph4_2_payable_account_id_fkey" FOREIGN KEY ("pph4_2_payable_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_default_sales_tax_code_id_fkey" FOREIGN KEY ("default_sales_tax_code_id") REFERENCES "tax_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_default_withholding_tax_code_id_fkey" FOREIGN KEY ("default_withholding_tax_code_id") REFERENCES "tax_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_posted_by_id_fkey" FOREIGN KEY ("posted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoice_lines" ADD CONSTRAINT "sales_invoice_lines_sales_invoice_id_fkey" FOREIGN KEY ("sales_invoice_id") REFERENCES "sales_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoice_lines" ADD CONSTRAINT "sales_invoice_lines_revenue_account_id_fkey" FOREIGN KEY ("revenue_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoice_lines" ADD CONSTRAINT "sales_invoice_lines_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoice_lines" ADD CONSTRAINT "sales_invoice_lines_tax_code_id_fkey" FOREIGN KEY ("tax_code_id") REFERENCES "tax_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_default_purchase_tax_code_id_fkey" FOREIGN KEY ("default_purchase_tax_code_id") REFERENCES "tax_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_default_withholding_tax_code_id_fkey" FOREIGN KEY ("default_withholding_tax_code_id") REFERENCES "tax_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_expense_account_id_fkey" FOREIGN KEY ("expense_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_bills" ADD CONSTRAINT "vendor_bills_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_bills" ADD CONSTRAINT "vendor_bills_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_bills" ADD CONSTRAINT "vendor_bills_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_bills" ADD CONSTRAINT "vendor_bills_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_bills" ADD CONSTRAINT "vendor_bills_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_bills" ADD CONSTRAINT "vendor_bills_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_bills" ADD CONSTRAINT "vendor_bills_posted_by_id_fkey" FOREIGN KEY ("posted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_bill_lines" ADD CONSTRAINT "vendor_bill_lines_vendor_bill_id_fkey" FOREIGN KEY ("vendor_bill_id") REFERENCES "vendor_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_bill_lines" ADD CONSTRAINT "vendor_bill_lines_expense_account_id_fkey" FOREIGN KEY ("expense_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_bill_lines" ADD CONSTRAINT "vendor_bill_lines_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_bill_lines" ADD CONSTRAINT "vendor_bill_lines_asset_category_id_fkey" FOREIGN KEY ("asset_category_id") REFERENCES "fixed_asset_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_bill_lines" ADD CONSTRAINT "vendor_bill_lines_goods_receipt_line_id_fkey" FOREIGN KEY ("goods_receipt_line_id") REFERENCES "goods_receipt_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_bill_lines" ADD CONSTRAINT "vendor_bill_lines_tax_code_id_fkey" FOREIGN KEY ("tax_code_id") REFERENCES "tax_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_bank_accounts" ADD CONSTRAINT "cash_bank_accounts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_bank_accounts" ADD CONSTRAINT "cash_bank_accounts_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_bank_accounts" ADD CONSTRAINT "cash_bank_accounts_coa_account_id_fkey" FOREIGN KEY ("coa_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_cash_bank_account_id_fkey" FOREIGN KEY ("cash_bank_account_id") REFERENCES "cash_bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_to_cash_bank_account_id_fkey" FOREIGN KEY ("to_cash_bank_account_id") REFERENCES "cash_bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_withholding_tax_code_id_fkey" FOREIGN KEY ("withholding_tax_code_id") REFERENCES "tax_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_posted_by_id_fkey" FOREIGN KEY ("posted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_sales_invoice_id_fkey" FOREIGN KEY ("sales_invoice_id") REFERENCES "sales_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_vendor_bill_id_fkey" FOREIGN KEY ("vendor_bill_id") REFERENCES "vendor_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_statement_imports" ADD CONSTRAINT "bank_statement_imports_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_statement_imports" ADD CONSTRAINT "bank_statement_imports_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_statement_imports" ADD CONSTRAINT "bank_statement_imports_cash_bank_account_id_fkey" FOREIGN KEY ("cash_bank_account_id") REFERENCES "cash_bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_statement_imports" ADD CONSTRAINT "bank_statement_imports_imported_by_id_fkey" FOREIGN KEY ("imported_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_statement_lines" ADD CONSTRAINT "bank_statement_lines_bank_statement_import_id_fkey" FOREIGN KEY ("bank_statement_import_id") REFERENCES "bank_statement_imports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_reconciliations" ADD CONSTRAINT "bank_reconciliations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_reconciliations" ADD CONSTRAINT "bank_reconciliations_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_reconciliations" ADD CONSTRAINT "bank_reconciliations_cash_bank_account_id_fkey" FOREIGN KEY ("cash_bank_account_id") REFERENCES "cash_bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_reconciliations" ADD CONSTRAINT "bank_reconciliations_completed_by_id_fkey" FOREIGN KEY ("completed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_reconciliation_matches" ADD CONSTRAINT "bank_reconciliation_matches_bank_statement_line_id_fkey" FOREIGN KEY ("bank_statement_line_id") REFERENCES "bank_statement_lines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_reconciliation_matches" ADD CONSTRAINT "bank_reconciliation_matches_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_reconciliation_matches" ADD CONSTRAINT "bank_reconciliation_matches_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_of_measures" ADD CONSTRAINT "unit_of_measures_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_categories" ADD CONSTRAINT "inventory_categories_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_categories" ADD CONSTRAINT "inventory_categories_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_categories" ADD CONSTRAINT "inventory_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "inventory_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_locations" ADD CONSTRAINT "stock_locations_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "inventory_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_unit_of_measure_id_fkey" FOREIGN KEY ("unit_of_measure_id") REFERENCES "unit_of_measures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_inventory_account_id_fkey" FOREIGN KEY ("inventory_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_cogs_account_id_fkey" FOREIGN KEY ("cogs_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_sales_account_id_fkey" FOREIGN KEY ("sales_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_purchase_account_id_fkey" FOREIGN KEY ("purchase_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_posted_by_id_fkey" FOREIGN KEY ("posted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_valuation_layers" ADD CONSTRAINT "inventory_valuation_layers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_valuation_layers" ADD CONSTRAINT "inventory_valuation_layers_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_valuation_layers" ADD CONSTRAINT "inventory_valuation_layers_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_valuation_layers" ADD CONSTRAINT "inventory_valuation_layers_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_valuation_layers" ADD CONSTRAINT "inventory_valuation_layers_stock_movement_id_fkey" FOREIGN KEY ("stock_movement_id") REFERENCES "stock_movements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_posted_by_id_fkey" FOREIGN KEY ("posted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_goods_receipt_id_fkey" FOREIGN KEY ("goods_receipt_id") REFERENCES "goods_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_purchase_order_line_id_fkey" FOREIGN KEY ("purchase_order_line_id") REFERENCES "purchase_order_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_sales_invoice_id_fkey" FOREIGN KEY ("sales_invoice_id") REFERENCES "sales_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_posted_by_id_fkey" FOREIGN KEY ("posted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_lines" ADD CONSTRAINT "delivery_lines_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_lines" ADD CONSTRAINT "delivery_lines_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_lines" ADD CONSTRAINT "delivery_lines_sales_invoice_line_id_fkey" FOREIGN KEY ("sales_invoice_line_id") REFERENCES "sales_invoice_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_from_warehouse_id_fkey" FOREIGN KEY ("from_warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_to_warehouse_id_fkey" FOREIGN KEY ("to_warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_posted_by_id_fkey" FOREIGN KEY ("posted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfer_lines" ADD CONSTRAINT "stock_transfer_lines_stock_transfer_id_fkey" FOREIGN KEY ("stock_transfer_id") REFERENCES "stock_transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfer_lines" ADD CONSTRAINT "stock_transfer_lines_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_posted_by_id_fkey" FOREIGN KEY ("posted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustment_lines" ADD CONSTRAINT "stock_adjustment_lines_stock_adjustment_id_fkey" FOREIGN KEY ("stock_adjustment_id") REFERENCES "stock_adjustments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustment_lines" ADD CONSTRAINT "stock_adjustment_lines_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_asset_categories" ADD CONSTRAINT "fixed_asset_categories_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_asset_categories" ADD CONSTRAINT "fixed_asset_categories_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_asset_categories" ADD CONSTRAINT "fixed_asset_categories_fixed_asset_account_id_fkey" FOREIGN KEY ("fixed_asset_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_asset_categories" ADD CONSTRAINT "fixed_asset_categories_accumulated_depreciation_account_id_fkey" FOREIGN KEY ("accumulated_depreciation_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_asset_categories" ADD CONSTRAINT "fixed_asset_categories_depreciation_expense_account_id_fkey" FOREIGN KEY ("depreciation_expense_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_asset_categories" ADD CONSTRAINT "fixed_asset_categories_gain_on_disposal_account_id_fkey" FOREIGN KEY ("gain_on_disposal_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_asset_categories" ADD CONSTRAINT "fixed_asset_categories_loss_on_disposal_account_id_fkey" FOREIGN KEY ("loss_on_disposal_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "fixed_asset_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_vendor_bill_id_fkey" FOREIGN KEY ("vendor_bill_id") REFERENCES "vendor_bills"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_vendor_bill_line_id_fkey" FOREIGN KEY ("vendor_bill_line_id") REFERENCES "vendor_bill_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_capitalized_by_id_fkey" FOREIGN KEY ("capitalized_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_depreciation_schedules" ADD CONSTRAINT "asset_depreciation_schedules_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "fixed_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_depreciation_schedules" ADD CONSTRAINT "asset_depreciation_schedules_depreciation_run_id_fkey" FOREIGN KEY ("depreciation_run_id") REFERENCES "depreciation_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_depreciation_schedules" ADD CONSTRAINT "asset_depreciation_schedules_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depreciation_runs" ADD CONSTRAINT "depreciation_runs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depreciation_runs" ADD CONSTRAINT "depreciation_runs_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depreciation_runs" ADD CONSTRAINT "depreciation_runs_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depreciation_runs" ADD CONSTRAINT "depreciation_runs_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depreciation_runs" ADD CONSTRAINT "depreciation_runs_posted_by_id_fkey" FOREIGN KEY ("posted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_movements" ADD CONSTRAINT "asset_movements_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "fixed_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_movements" ADD CONSTRAINT "asset_movements_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_disposals" ADD CONSTRAINT "asset_disposals_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_disposals" ADD CONSTRAINT "asset_disposals_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_disposals" ADD CONSTRAINT "asset_disposals_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "fixed_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_disposals" ADD CONSTRAINT "asset_disposals_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_disposals" ADD CONSTRAINT "asset_disposals_cash_bank_account_id_fkey" FOREIGN KEY ("cash_bank_account_id") REFERENCES "cash_bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_disposals" ADD CONSTRAINT "asset_disposals_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_disposals" ADD CONSTRAINT "asset_disposals_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_disposals" ADD CONSTRAINT "asset_disposals_posted_by_id_fkey" FOREIGN KEY ("posted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_impairments" ADD CONSTRAINT "asset_impairments_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "fixed_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_impairments" ADD CONSTRAINT "asset_impairments_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_codes" ADD CONSTRAINT "tax_codes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_rules" ADD CONSTRAINT "tax_rules_tax_code_id_fkey" FOREIGN KEY ("tax_code_id") REFERENCES "tax_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_transactions" ADD CONSTRAINT "tax_transactions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_transactions" ADD CONSTRAINT "tax_transactions_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_transactions" ADD CONSTRAINT "tax_transactions_tax_code_id_fkey" FOREIGN KEY ("tax_code_id") REFERENCES "tax_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_transactions" ADD CONSTRAINT "tax_transactions_tax_rule_id_fkey" FOREIGN KEY ("tax_rule_id") REFERENCES "tax_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_transactions" ADD CONSTRAINT "tax_transactions_tax_period_id_fkey" FOREIGN KEY ("tax_period_id") REFERENCES "tax_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_transactions" ADD CONSTRAINT "tax_transactions_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_transactions" ADD CONSTRAINT "tax_transactions_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_transactions" ADD CONSTRAINT "tax_transactions_reversal_of_id_fkey" FOREIGN KEY ("reversal_of_id") REFERENCES "tax_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_periods" ADD CONSTRAINT "tax_periods_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_periods" ADD CONSTRAINT "tax_periods_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_periods" ADD CONSTRAINT "tax_periods_filed_by_id_fkey" FOREIGN KEY ("filed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_documents" ADD CONSTRAINT "tax_documents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_documents" ADD CONSTRAINT "tax_documents_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_documents" ADD CONSTRAINT "tax_documents_tax_period_id_fkey" FOREIGN KEY ("tax_period_id") REFERENCES "tax_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_documents" ADD CONSTRAINT "tax_documents_tax_code_id_fkey" FOREIGN KEY ("tax_code_id") REFERENCES "tax_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_documents" ADD CONSTRAINT "tax_documents_tax_transaction_id_fkey" FOREIGN KEY ("tax_transaction_id") REFERENCES "tax_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_documents" ADD CONSTRAINT "tax_documents_replaced_by_id_fkey" FOREIGN KEY ("replaced_by_id") REFERENCES "tax_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_payments" ADD CONSTRAINT "tax_payments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_payments" ADD CONSTRAINT "tax_payments_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_payments" ADD CONSTRAINT "tax_payments_tax_period_id_fkey" FOREIGN KEY ("tax_period_id") REFERENCES "tax_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_payments" ADD CONSTRAINT "tax_payments_cash_bank_account_id_fkey" FOREIGN KEY ("cash_bank_account_id") REFERENCES "cash_bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_payments" ADD CONSTRAINT "tax_payments_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_payments" ADD CONSTRAINT "tax_payments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_payments" ADD CONSTRAINT "tax_payments_posted_by_id_fkey" FOREIGN KEY ("posted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withholding_evidences" ADD CONSTRAINT "withholding_evidences_tax_transaction_id_fkey" FOREIGN KEY ("tax_transaction_id") REFERENCES "tax_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_employees" ADD CONSTRAINT "payroll_employees_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_employees" ADD CONSTRAINT "payroll_employees_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
