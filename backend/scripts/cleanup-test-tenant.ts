import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Development-only utility script to safely purge business records
 * of a designated contaminated development test tenant.
 *
 * Usage:
 * TARGET_ORG_ID="<org-uuid>" CONFIRM_PURGE="YES" npx ts-node scripts/cleanup-test-tenant.ts
 */
async function main() {
  const targetOrgId = process.env.TARGET_ORG_ID?.trim();
  const confirm = process.env.CONFIRM_PURGE?.trim();

  if (!targetOrgId) {
    console.error('ERROR: Please provide TARGET_ORG_ID environment variable.');
    process.exit(1);
  }

  if (confirm !== 'YES') {
    console.error('ERROR: Safety check failed. Set CONFIRM_PURGE="YES" to confirm deletion.');
    process.exit(1);
  }

  // Safety check: Never delete the demo organization
  const org = await prisma.organization.findUnique({
    where: { id: targetOrgId },
  });

  if (!org) {
    console.error(`ERROR: Organization with ID ${targetOrgId} not found.`);
    process.exit(1);
  }

  if (org.slug === 'berkah-cahaya-group' || org.name.toLowerCase().includes('demo')) {
    console.error(`SAFETY BLOCK: Cannot cleanup demo organization (${org.name} / ${org.slug}).`);
    process.exit(1);
  }

  console.log(`Starting cleanup of test organization: ${org.name} (${org.id})...`);

  // Delete business data in transaction
  await prisma.$transaction(async (tx) => {
    // 1. Journal Lines and Entries
    await tx.journalLine.deleteMany({ where: { journalEntry: { organizationId: targetOrgId } } });
    await tx.journalEntry.deleteMany({ where: { organizationId: targetOrgId } });

    // 2. Sales
    await tx.salesInvoiceLine.deleteMany({ where: { salesInvoice: { organizationId: targetOrgId } } });
    await tx.salesInvoice.deleteMany({ where: { organizationId: targetOrgId } });
    await tx.customer.deleteMany({ where: { organizationId: targetOrgId } });

    // 3. Purchases
    await tx.vendorBillLine.deleteMany({ where: { vendorBill: { organizationId: targetOrgId } } });
    await tx.purchaseOrderLine.deleteMany({ where: { purchaseOrder: { organizationId: targetOrgId } } });
    await tx.vendorBill.deleteMany({ where: { organizationId: targetOrgId } });
    await tx.purchaseOrder.deleteMany({ where: { organizationId: targetOrgId } });
    await tx.vendor.deleteMany({ where: { organizationId: targetOrgId } });

    // 4. Payments and Banking
    await tx.payment.deleteMany({ where: { organizationId: targetOrgId } });
    await tx.cashBankAccount.deleteMany({ where: { organizationId: targetOrgId } });

    // 5. Inventory
    await tx.stockMovement.deleteMany({ where: { organizationId: targetOrgId } });
    await tx.inventoryItem.deleteMany({ where: { organizationId: targetOrgId } });
    await tx.warehouse.deleteMany({ where: { organizationId: targetOrgId } });

    // 6. Assets
    await tx.fixedAsset.deleteMany({ where: { organizationId: targetOrgId } });

    // 7. Budgets & Projects & Payroll & Tax
    await tx.budget.deleteMany({ where: { organizationId: targetOrgId } });
    await tx.project.deleteMany({ where: { organizationId: targetOrgId } });
    await tx.payrollRun.deleteMany({ where: { organizationId: targetOrgId } });
    await tx.payrollEmployee.deleteMany({ where: { organizationId: targetOrgId } });
    await tx.taxTransaction.deleteMany({ where: { organizationId: targetOrgId } });
    await tx.taxPeriod.deleteMany({ where: { organizationId: targetOrgId } });
    await tx.taxCode.deleteMany({ where: { organizationId: targetOrgId } });

    // 8. Accounting Settings & Chart of Accounts
    await tx.accountingSettings.deleteMany({ where: { organizationId: targetOrgId } });
    await tx.account.deleteMany({ where: { organizationId: targetOrgId } });
  });

  console.log(`Successfully cleaned up all business records for organization ${org.name} (${org.id}).`);
}

main()
  .catch((e) => {
    console.error('Cleanup error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
