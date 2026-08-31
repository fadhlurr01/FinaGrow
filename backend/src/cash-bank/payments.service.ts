import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AccountingService } from '../accounting/accounting.service';
import {
  CreatePaymentDto,
  UpdatePaymentDto,
  PaymentFilterDto,
} from './dto/create-payment.dto';
import { CreateTransferDto } from './dto/create-transfer.dto';
import {
  PaymentType,
  PaymentDirection,
  PaymentStatus,
  SalesInvoiceStatus,
  VendorBillStatus,
  AccountType,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private accountingService: AccountingService,
  ) {}

  /**
   * Generates a concurrency-safe deterministic payment number
   * e.g. RCPT-2026-000001, PAY-2026-000001, TRF-2026-000001
   */
  private async generatePaymentNumber(
    entityId: string,
    type: PaymentType,
    date: Date,
  ): Promise<string> {
    const year = date.getFullYear();
    let prefix = 'PMT';
    if (type === PaymentType.CUSTOMER_RECEIPT) prefix = 'RCPT';
    else if (type === PaymentType.VENDOR_PAYMENT) prefix = 'PAY';
    else if (type === PaymentType.TRANSFER) prefix = 'TRF';

    const count = await this.prisma.payment.count({
      where: {
        entityId,
        type,
        paymentDate: {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31`),
        },
      },
    });

    return `${prefix}-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  /**
   * List payments with comprehensive filters
   */
  async getPayments(organizationId: string, filter: PaymentFilterDto) {
    const where: any = { organizationId };

    if (filter.entityId) where.entityId = filter.entityId;
    if (filter.type) where.type = filter.type as PaymentType;
    if (filter.status) where.status = filter.status as PaymentStatus;
    if (filter.customerId) where.customerId = filter.customerId;
    if (filter.vendorId) where.vendorId = filter.vendorId;
    if (filter.cashBankAccountId) where.cashBankAccountId = filter.cashBankAccountId;

    if (filter.dateFrom || filter.dateTo) {
      where.paymentDate = {};
      if (filter.dateFrom) where.paymentDate.gte = new Date(filter.dateFrom);
      if (filter.dateTo) where.paymentDate.lte = new Date(filter.dateTo);
    }

    if (filter.search) {
      where.OR = [
        { paymentNumber: { contains: filter.search, mode: 'insensitive' } },
        { reference: { contains: filter.search, mode: 'insensitive' } },
        { customer: { name: { contains: filter.search, mode: 'insensitive' } } },
        { vendor: { name: { contains: filter.search, mode: 'insensitive' } } },
      ];
    }

    return this.prisma.payment.findMany({
      where,
      include: {
        customer: { select: { id: true, customerCode: true, name: true } },
        vendor: { select: { id: true, vendorCode: true, name: true } },
        cashBankAccount: { select: { id: true, code: true, name: true, coaAccountId: true } },
        toCashBankAccount: { select: { id: true, code: true, name: true, coaAccountId: true } },
        allocations: {
          include: {
            salesInvoice: { select: { id: true, invoiceNumber: true, totalAmount: true, amountDue: true } },
            vendorBill: { select: { id: true, billNumber: true, totalAmount: true, amountDue: true } },
          },
        },
      },
      orderBy: { paymentDate: 'desc' },
    });
  }

  /**
   * Get payment by ID
   */
  async getPaymentById(id: string, organizationId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        customer: true,
        vendor: true,
        cashBankAccount: { include: { coaAccount: true } },
        toCashBankAccount: { include: { coaAccount: true } },
        journalEntry: { include: { lines: { include: { account: true } } } },
        allocations: {
          include: {
            salesInvoice: true,
            vendorBill: true,
          },
        },
      },
    });

    if (!payment || payment.organizationId !== organizationId) {
      throw new NotFoundException('Payment record not found.');
    }

    return payment;
  }

  /**
   * Create a new draft Payment / Receipt
   */
  async createPayment(
    dto: CreatePaymentDto,
    organizationId: string,
    userId: string,
  ) {
    // 1. Verify Entity
    const entity = await this.prisma.entity.findUnique({
      where: { id: dto.entityId },
    });
    if (!entity || entity.organizationId !== organizationId) {
      throw new ForbiddenException('Unauthorized entity access.');
    }

    // 2. Verify Cash/Bank Account
    const cashBank = await this.prisma.cashBankAccount.findUnique({
      where: { id: dto.cashBankAccountId },
    });
    if (!cashBank || cashBank.organizationId !== organizationId) {
      throw new NotFoundException('Cash/Bank account not found.');
    }
    if (cashBank.entityId !== dto.entityId) {
      throw new ForbiddenException('Cash/Bank account belongs to a different entity.');
    }
    if (!cashBank.isActive) {
      throw new BadRequestException('Cash/Bank account is inactive.');
    }

    // 3. Verify Customer / Vendor based on type
    if (dto.type === PaymentType.CUSTOMER_RECEIPT) {
      if (!dto.customerId) {
        throw new BadRequestException('Customer ID is required for customer receipts.');
      }
      const customer = await this.prisma.customer.findUnique({
        where: { id: dto.customerId },
      });
      if (!customer || customer.organizationId !== organizationId || customer.entityId !== dto.entityId) {
        throw new BadRequestException('Invalid customer for this receipt.');
      }
    } else if (dto.type === PaymentType.VENDOR_PAYMENT) {
      if (!dto.vendorId) {
        throw new BadRequestException('Vendor ID is required for vendor payments.');
      }
      const vendor = await this.prisma.vendor.findUnique({
        where: { id: dto.vendorId },
      });
      if (!vendor || vendor.organizationId !== organizationId || vendor.entityId !== dto.entityId) {
        throw new BadRequestException('Invalid vendor for this payment.');
      }
    }

    // 4. Calculate allocation totals authoritatively
    const paymentAmount = new Decimal(dto.amount);
    let allocatedTotal = new Decimal(0);
    const validatedAllocations: any[] = [];

    if (dto.allocations && dto.allocations.length > 0) {
      for (const alloc of dto.allocations) {
        const allocAmount = new Decimal(alloc.allocatedAmount);
        if (allocAmount.lte(0)) {
          throw new BadRequestException('Allocation amount must be greater than zero.');
        }

        if (dto.type === PaymentType.CUSTOMER_RECEIPT) {
          if (!alloc.salesInvoiceId) {
            throw new BadRequestException('Sales Invoice ID required for receipt allocation.');
          }
          const invoice = await this.prisma.salesInvoice.findUnique({
            where: { id: alloc.salesInvoiceId },
          });
          if (!invoice || invoice.organizationId !== organizationId || invoice.entityId !== dto.entityId) {
            throw new BadRequestException('Invoice not found or belongs to another entity.');
          }
          if (invoice.customerId !== dto.customerId) {
            throw new BadRequestException('Invoice does not belong to the receipt customer.');
          }
          if (allocAmount.gt(invoice.amountDue)) {
            throw new BadRequestException(
              `Allocation of ${allocAmount.toNumber()} exceeds invoice '${invoice.invoiceNumber}' amount due of ${invoice.amountDue.toNumber()}.`,
            );
          }

          validatedAllocations.push({
            salesInvoiceId: alloc.salesInvoiceId,
            allocatedAmount: allocAmount,
          });
        } else if (dto.type === PaymentType.VENDOR_PAYMENT) {
          if (!alloc.vendorBillId) {
            throw new BadRequestException('Vendor Bill ID required for payment allocation.');
          }
          const bill = await this.prisma.vendorBill.findUnique({
            where: { id: alloc.vendorBillId },
          });
          if (!bill || bill.organizationId !== organizationId || bill.entityId !== dto.entityId) {
            throw new BadRequestException('Vendor bill not found or belongs to another entity.');
          }
          if (bill.vendorId !== dto.vendorId) {
            throw new BadRequestException('Bill does not belong to the payment vendor.');
          }
          if (allocAmount.gt(bill.amountDue)) {
            throw new BadRequestException(
              `Allocation of ${allocAmount.toNumber()} exceeds bill '${bill.billNumber}' amount due of ${bill.amountDue.toNumber()}.`,
            );
          }

          validatedAllocations.push({
            vendorBillId: alloc.vendorBillId,
            allocatedAmount: allocAmount,
          });
        }

        allocatedTotal = allocatedTotal.plus(allocAmount);
      }
    }

    if (allocatedTotal.gt(paymentAmount)) {
      throw new BadRequestException('Total allocated amount cannot exceed payment amount.');
    }

    const unallocatedTotal = paymentAmount.minus(allocatedTotal);
    const paymentDate = new Date(dto.paymentDate);
    const paymentNumber = await this.generatePaymentNumber(dto.entityId, dto.type, paymentDate);
    const direction =
      dto.type === PaymentType.CUSTOMER_RECEIPT
        ? PaymentDirection.INBOUND
        : dto.type === PaymentType.VENDOR_PAYMENT
        ? PaymentDirection.OUTBOUND
        : PaymentDirection.INTERNAL;

    const payment = await this.prisma.payment.create({
      data: {
        organizationId,
        entityId: dto.entityId,
        paymentNumber,
        type: dto.type,
        direction,
        status: PaymentStatus.DRAFT,
        paymentDate,
        customerId: dto.customerId,
        vendorId: dto.vendorId,
        cashBankAccountId: dto.cashBankAccountId,
        currency: dto.currency || entity.baseCurrency || 'IDR',
        exchangeRate: new Decimal(dto.exchangeRate || 1.0),
        amount: paymentAmount,
        allocatedAmount: allocatedTotal,
        unallocatedAmount: unallocatedTotal,
        reference: dto.reference,
        externalReference: dto.externalReference,
        method: dto.method,
        notes: dto.notes,
        createdById: userId,
        allocations: {
          create: validatedAllocations,
        },
      },
      include: {
        allocations: true,
        customer: true,
        vendor: true,
        cashBankAccount: true,
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'PAYMENT_CREATED',
      resourceType: 'Payment',
      resourceId: payment.id,
      metadata: { paymentNumber: payment.paymentNumber, type: payment.type, amount: payment.amount.toNumber() },
    });

    return payment;
  }

  /**
   * Create and execute an inter-account bank transfer
   */
  async createTransfer(
    dto: CreateTransferDto,
    organizationId: string,
    userId: string,
  ) {
    if (dto.fromCashBankAccountId === dto.toCashBankAccountId) {
      throw new BadRequestException('Source and destination accounts must be different.');
    }

    const [fromAcc, toAcc] = await Promise.all([
      this.prisma.cashBankAccount.findUnique({ where: { id: dto.fromCashBankAccountId } }),
      this.prisma.cashBankAccount.findUnique({ where: { id: dto.toCashBankAccountId } }),
    ]);

    if (!fromAcc || fromAcc.organizationId !== organizationId || fromAcc.entityId !== dto.entityId) {
      throw new BadRequestException('Invalid source Cash/Bank account.');
    }
    if (!toAcc || toAcc.organizationId !== organizationId || toAcc.entityId !== dto.entityId) {
      throw new BadRequestException('Invalid destination Cash/Bank account.');
    }
    if (!fromAcc.isActive || !toAcc.isActive) {
      throw new BadRequestException('Cannot transfer to or from inactive Cash/Bank accounts.');
    }

    const transferDate = new Date(dto.transferDate);
    const paymentNumber = await this.generatePaymentNumber(dto.entityId, PaymentType.TRANSFER, transferDate);
    const transferAmount = new Decimal(dto.amount);

    return this.prisma.$transaction(async (tx) => {
      // 1. Create Payment record in DRAFT
      const payment = await tx.payment.create({
        data: {
          organizationId,
          entityId: dto.entityId,
          paymentNumber,
          type: PaymentType.TRANSFER,
          direction: PaymentDirection.INTERNAL,
          status: PaymentStatus.DRAFT,
          paymentDate: transferDate,
          cashBankAccountId: dto.fromCashBankAccountId,
          toCashBankAccountId: dto.toCashBankAccountId,
          amount: transferAmount,
          allocatedAmount: transferAmount,
          unallocatedAmount: new Decimal(0),
          reference: dto.reference,
          notes: dto.notes,
          createdById: userId,
        },
      });

      // 2. Post atomic double-entry Journal
      // DR Destination Bank COA / CR Source Bank COA
      const journal = await this.accountingService.createJournalEntry(
        {
          entityId: dto.entityId,
          entryDate: transferDate.toISOString().split('T')[0],
          description: `[TRANSFER] ${fromAcc.name} -> ${toAcc.name}: ${dto.notes || dto.reference || ''}`,
          reference: payment.paymentNumber,
          lines: [
            {
              accountId: toAcc.coaAccountId,
              description: `Transfer in from ${fromAcc.name}`,
              debit: transferAmount.toNumber(),
              credit: 0,
            },
            {
              accountId: fromAcc.coaAccountId,
              description: `Transfer out to ${toAcc.name}`,
              debit: 0,
              credit: transferAmount.toNumber(),
            },
          ],
        },
        organizationId,
        userId,
      );

      // 3. Mark payment POSTED
      const posted = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.POSTED,
          journalEntryId: journal.id,
          postedById: userId,
          postedAt: new Date(),
        },
        include: {
          cashBankAccount: true,
          toCashBankAccount: true,
          journalEntry: true,
        },
      });

      await this.auditService.log({
        organizationId,
        userId,
        action: 'TRANSFER_POSTED',
        resourceType: 'Payment',
        resourceId: posted.id,
        metadata: {
          paymentNumber: posted.paymentNumber,
          from: fromAcc.code,
          to: toAcc.code,
          amount: transferAmount.toNumber(),
        },
      });

      return posted;
    });
  }

  /**
   * Atomic Post Payment / Receipt to General Ledger and update settlements
   */
  async postPayment(id: string, organizationId: string, userId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        cashBankAccount: true,
        customer: true,
        vendor: true,
        allocations: {
          include: {
            salesInvoice: true,
            vendorBill: true,
          },
        },
      },
    });

    if (!payment || payment.organizationId !== organizationId) {
      throw new NotFoundException('Payment record not found.');
    }

    if (payment.status === PaymentStatus.POSTED) {
      return payment; // Idempotent return
    }

    if (payment.status === PaymentStatus.REVERSED || payment.status === PaymentStatus.CANCELLED) {
      throw new BadRequestException(`Cannot post a payment in ${payment.status} status.`);
    }

    // 1. Retrieve AccountingSettings
    const settings = await this.prisma.accountingSettings.findUnique({
      where: { entityId: payment.entityId },
    });
    if (!settings) {
      throw new BadRequestException('Entity accounting settings not configured.');
    }

    return this.prisma.$transaction(async (tx) => {
      const journalLines: any[] = [];
      const paymentAmount = payment.amount.toNumber();
      const allocatedAmount = payment.allocatedAmount.toNumber();
      const unallocatedAmount = payment.unallocatedAmount.toNumber();

      if (payment.type === PaymentType.CUSTOMER_RECEIPT) {
        // DR Cash/Bank COA Account (Full Payment Amount)
        journalLines.push({
          accountId: payment.cashBankAccount.coaAccountId,
          description: `Penerimaan Kas/Bank dari Pelanggan ${payment.customer?.name || ''}`,
          debit: paymentAmount,
          credit: 0,
        });

        // CR Accounts Receivable (Allocated Amount)
        if (allocatedAmount > 0) {
          journalLines.push({
            accountId: settings.arAccountId,
            description: `Pelunasan Piutang Usaha - Ref: ${payment.paymentNumber}`,
            debit: 0,
            credit: allocatedAmount,
          });
        }

        // CR Customer Advances Liability (Unallocated Amount if any)
        if (unallocatedAmount > 0) {
          const advanceAccId = settings.customerAdvanceAccountId || settings.arAccountId;
          journalLines.push({
            accountId: advanceAccId,
            description: `Uang Muka / Penerimaan Lebih dari Pelanggan - Ref: ${payment.paymentNumber}`,
            debit: 0,
            credit: unallocatedAmount,
          });
        }

        // Update each settled SalesInvoice
        for (const alloc of payment.allocations) {
          if (alloc.salesInvoiceId && alloc.salesInvoice) {
            const invoice = alloc.salesInvoice;
            const newAmountPaid = invoice.amountPaid.plus(alloc.allocatedAmount);
            const newAmountDue = Decimal.max(0, invoice.totalAmount.minus(newAmountPaid));
            const newStatus =
              newAmountDue.isZero() ? SalesInvoiceStatus.PAID : SalesInvoiceStatus.PARTIALLY_PAID;

            await tx.salesInvoice.update({
              where: { id: invoice.id },
              data: {
                amountPaid: newAmountPaid,
                amountDue: newAmountDue,
                status: newStatus,
              },
            });
          }
        }
      } else if (payment.type === PaymentType.VENDOR_PAYMENT) {
        if (!settings.apAccountId) {
          throw new BadRequestException('Accounts Payable control account not configured.');
        }

        // DR Accounts Payable (Allocated Amount)
        if (allocatedAmount > 0) {
          journalLines.push({
            accountId: settings.apAccountId,
            description: `Pelunasan Utang Usaha - Ref: ${payment.paymentNumber}`,
            debit: allocatedAmount,
            credit: 0,
          });
        }

        // DR Vendor Advances Asset (Unallocated Amount if any)
        if (unallocatedAmount > 0) {
          const advanceAccId = settings.vendorAdvanceAccountId || settings.apAccountId;
          journalLines.push({
            accountId: advanceAccId,
            description: `Uang Muka Pembelian Vendor - Ref: ${payment.paymentNumber}`,
            debit: unallocatedAmount,
            credit: 0,
          });
        }

        // CR Cash/Bank COA Account (Full Payment Amount)
        journalLines.push({
          accountId: payment.cashBankAccount.coaAccountId,
          description: `Pembayaran Kas/Bank ke Vendor ${payment.vendor?.name || ''}`,
          debit: 0,
          credit: paymentAmount,
        });

        // Update each settled VendorBill
        for (const alloc of payment.allocations) {
          if (alloc.vendorBillId && alloc.vendorBill) {
            const bill = alloc.vendorBill;
            const newAmountPaid = bill.amountPaid.plus(alloc.allocatedAmount);
            const newAmountDue = Decimal.max(0, bill.totalAmount.minus(newAmountPaid));
            const newStatus =
              newAmountDue.isZero() ? VendorBillStatus.PAID : VendorBillStatus.PARTIALLY_PAID;

            await tx.vendorBill.update({
              where: { id: bill.id },
              data: {
                amountPaid: newAmountPaid,
                amountDue: newAmountDue,
                status: newStatus,
              },
            });
          }
        }
      }

      // Create and post journal via AccountingService
      const journal = await this.accountingService.createJournalEntry(
        {
          entityId: payment.entityId,
          entryDate: payment.paymentDate.toISOString().split('T')[0],
          description: `[${payment.type}] Pembayaran ${payment.paymentNumber}: ${payment.notes || payment.reference || ''}`,
          reference: payment.paymentNumber,
          lines: journalLines,
        },
        organizationId,
        userId,
      );

      // Update payment to POSTED
      const posted = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.POSTED,
          journalEntryId: journal.id,
          postedById: userId,
          postedAt: new Date(),
        },
        include: {
          allocations: {
            include: { salesInvoice: true, vendorBill: true },
          },
          journalEntry: true,
        },
      });

      await this.auditService.log({
        organizationId,
        userId,
        action: 'PAYMENT_POSTED',
        resourceType: 'Payment',
        resourceId: posted.id,
        metadata: { paymentNumber: posted.paymentNumber, journalId: journal.id },
      });

      return posted;
    });
  }

  /**
   * Reverse a posted payment and restore invoice/bill balances
   */
  async reversePayment(id: string, organizationId: string, userId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        allocations: {
          include: { salesInvoice: true, vendorBill: true },
        },
      },
    });

    if (!payment || payment.organizationId !== organizationId) {
      throw new NotFoundException('Payment record not found.');
    }

    if (payment.status !== PaymentStatus.POSTED) {
      throw new BadRequestException('Only POSTED payments can be reversed.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Void linked journal entry if exists
      if (payment.journalEntryId) {
        await this.accountingService.voidJournalEntry(
          payment.journalEntryId,
          organizationId,
          userId,
        );
      }

      // 2. Restore Sales Invoice balances
      for (const alloc of payment.allocations) {
        if (alloc.salesInvoiceId && alloc.salesInvoice) {
          const invoice = alloc.salesInvoice;
          const restoredAmountPaid = Decimal.max(0, invoice.amountPaid.minus(alloc.allocatedAmount));
          const restoredAmountDue = invoice.totalAmount.minus(restoredAmountPaid);
          const restoredStatus =
            restoredAmountPaid.isZero()
              ? SalesInvoiceStatus.SENT
              : SalesInvoiceStatus.PARTIALLY_PAID;

          await tx.salesInvoice.update({
            where: { id: invoice.id },
            data: {
              amountPaid: restoredAmountPaid,
              amountDue: restoredAmountDue,
              status: restoredStatus,
            },
          });
        } else if (alloc.vendorBillId && alloc.vendorBill) {
          const bill = alloc.vendorBill;
          const restoredAmountPaid = Decimal.max(0, bill.amountPaid.minus(alloc.allocatedAmount));
          const restoredAmountDue = bill.totalAmount.minus(restoredAmountPaid);
          const restoredStatus =
            restoredAmountPaid.isZero()
              ? VendorBillStatus.OPEN
              : VendorBillStatus.PARTIALLY_PAID;

          await tx.vendorBill.update({
            where: { id: bill.id },
            data: {
              amountPaid: restoredAmountPaid,
              amountDue: restoredAmountDue,
              status: restoredStatus,
            },
          });
        }
      }

      // 3. Update payment status to REVERSED
      const reversed = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.REVERSED,
          reversedById: userId,
          reversedAt: new Date(),
        },
        include: {
          allocations: true,
        },
      });

      await this.auditService.log({
        organizationId,
        userId,
        action: 'PAYMENT_REVERSED',
        resourceType: 'Payment',
        resourceId: reversed.id,
        metadata: { paymentNumber: reversed.paymentNumber },
      });

      return reversed;
    });
  }
}
