import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreatePayrollRunDto,
  UpdatePayrollRunDto,
  CreatePayrollEmployeeDto,
  UpdatePayrollEmployeeDto,
} from './dto/payroll.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class PayrollService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  // ──────────────────────────────────────────────────────────────────
  // PAYROLL RUNS
  // ──────────────────────────────────────────────────────────────────

  async getPayrollRuns(organizationId: string, entityId?: string) {
    const where: any = { organizationId };
    if (entityId) where.entityId = entityId;

    return this.prisma.payrollRun.findMany({
      where,
      include: {
        entity: {
          select: { id: true, code: true, name: true },
        },
      },
      orderBy: { runDate: 'desc' },
    });
  }

  async getPayrollRunById(id: string, organizationId: string) {
    const run = await this.prisma.payrollRun.findFirst({
      where: { id, organizationId },
      include: { entity: true },
    });
    if (!run) throw new NotFoundException('Payroll run not found');
    return run;
  }

  async createPayrollRun(organizationId: string, dto: CreatePayrollRunDto, userId: string) {
    // If totals are not passed, calculate from active employees
    let totalGross = new Decimal(dto.totalGross ?? 0);
    let totalTaxes = new Decimal(dto.totalTaxes ?? 0);
    let totalNet = new Decimal(dto.totalNet ?? 0);
    let count = dto.employeeCount ?? 0;

    if (totalGross.isZero()) {
      const employees = await this.prisma.payrollEmployee.findMany({
        where: { organizationId, entityId: dto.entityId, isActive: true },
      });
      count = employees.length;

      for (const emp of employees) {
        const gross = new Decimal(emp.baseSalary).plus(new Decimal(emp.allowances));
        const tax = gross.times(0.05); // Estimated PPh 21 standard bracket
        const net = gross.minus(tax).minus(new Decimal(emp.deductions));
        totalGross = totalGross.plus(gross);
        totalTaxes = totalTaxes.plus(tax);
        totalNet = totalNet.plus(net);
      }
    }

    const run = await this.prisma.payrollRun.create({
      data: {
        organizationId,
        entityId: dto.entityId,
        payPeriod: dto.payPeriod,
        runDate: new Date(dto.runDate),
        totalGross,
        totalTaxes,
        totalNet,
        status: dto.status || 'Completed',
        employeeCount: count,
        notes: dto.notes,
        createdById: userId,
      },
      include: { entity: true },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'PAYROLL_RUN_CREATED',
      resourceType: 'PayrollRun',
      resourceId: run.id,
      metadata: { payPeriod: run.payPeriod, totalGross: totalGross.toNumber() },
    });

    return run;
  }

  async updatePayrollRun(id: string, organizationId: string, dto: UpdatePayrollRunDto, userId: string) {
    const run = await this.prisma.payrollRun.findFirst({
      where: { id, organizationId },
    });
    if (!run) throw new NotFoundException('Payroll run not found');

    const data: any = {};
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.totalGross !== undefined) data.totalGross = new Decimal(dto.totalGross);
    if (dto.totalTaxes !== undefined) data.totalTaxes = new Decimal(dto.totalTaxes);
    if (dto.totalNet !== undefined) data.totalNet = new Decimal(dto.totalNet);
    if (dto.notes !== undefined) data.notes = dto.notes;

    const updated = await this.prisma.payrollRun.update({
      where: { id },
      data,
      include: { entity: true },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'PAYROLL_RUN_UPDATED',
      resourceType: 'PayrollRun',
      resourceId: updated.id,
      metadata: { ...dto },
    });

    return updated;
  }

  async deletePayrollRun(id: string, organizationId: string, userId: string) {
    const run = await this.prisma.payrollRun.findFirst({
      where: { id, organizationId },
    });
    if (!run) throw new NotFoundException('Payroll run not found');

    // Protect finalized runs from arbitrary deletion
    if (run.status === 'Completed') {
      throw new BadRequestException('Cannot delete a finalized and completed payroll run. Archive or adjust instead.');
    }

    await this.prisma.payrollRun.delete({
      where: { id },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'PAYROLL_RUN_DELETED',
      resourceType: 'PayrollRun',
      resourceId: id,
      metadata: { payPeriod: run.payPeriod },
    });

    return { success: true, message: 'Payroll run deleted successfully' };
  }

  async getMetrics(organizationId: string, entityId?: string) {
    const where: any = { organizationId };
    if (entityId) where.entityId = entityId;

    const [runs, employees] = await Promise.all([
      this.prisma.payrollRun.findMany({
        where,
        orderBy: { runDate: 'desc' },
      }),
      this.prisma.payrollEmployee.findMany({
        where: { ...where, isActive: true },
      }),
    ]);

    const completedRuns = runs.filter((r) => r.status === 'Completed');
    const lastRunCost = completedRuns.length > 0 ? new Decimal(completedRuns[0].totalGross).toNumber() : 0;
    const employeeCount = employees.length > 0 ? employees.length : (runs[0]?.employeeCount ?? 0);
    const avgNetPay =
      completedRuns.length > 0 && employeeCount > 0
        ? new Decimal(completedRuns[0].totalNet).dividedBy(employeeCount).toNumber()
        : 0;

    const currentYear = new Date().getFullYear();
    const ytdRuns = completedRuns.filter((r) => new Date(r.runDate).getFullYear() === currentYear);
    const ytdCost = ytdRuns
      .reduce((acc, r) => acc.plus(new Decimal(r.totalGross)), new Decimal(0))
      .toNumber();

    return {
      lastPayrollCost: lastRunCost,
      employeesPaid: employeeCount,
      avgNetPay: Number(avgNetPay.toFixed(0)),
      ytdPayrollCost: ytdCost,
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // EMPLOYEES
  // ──────────────────────────────────────────────────────────────────

  async getEmployees(organizationId: string, entityId?: string) {
    const where: any = { organizationId };
    if (entityId) where.entityId = entityId;

    return this.prisma.payrollEmployee.findMany({
      where,
      include: {
        entity: { select: { id: true, code: true, name: true } },
      },
      orderBy: { employeeCode: 'asc' },
    });
  }

  async createEmployee(organizationId: string, dto: CreatePayrollEmployeeDto, userId: string) {
    const existing = await this.prisma.payrollEmployee.findUnique({
      where: {
        entityId_employeeCode: {
          entityId: dto.entityId,
          employeeCode: dto.employeeCode.trim().toUpperCase(),
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Employee code '${dto.employeeCode}' already exists for this entity.`);
    }

    const employee = await this.prisma.payrollEmployee.create({
      data: {
        organizationId,
        entityId: dto.entityId,
        employeeCode: dto.employeeCode.trim().toUpperCase(),
        name: dto.name.trim(),
        position: dto.position.trim(),
        baseSalary: new Decimal(dto.baseSalary),
        allowances: new Decimal(dto.allowances ?? 0),
        deductions: new Decimal(dto.deductions ?? 0),
        isActive: dto.isActive ?? true,
      },
      include: { entity: true },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'PAYROLL_EMPLOYEE_CREATED',
      resourceType: 'PayrollEmployee',
      resourceId: employee.id,
      metadata: { code: employee.employeeCode, name: employee.name },
    });

    return employee;
  }

  async updateEmployee(id: string, organizationId: string, dto: UpdatePayrollEmployeeDto, userId: string) {
    const employee = await this.prisma.payrollEmployee.findFirst({
      where: { id, organizationId },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.position !== undefined) data.position = dto.position.trim();
    if (dto.baseSalary !== undefined) data.baseSalary = new Decimal(dto.baseSalary);
    if (dto.allowances !== undefined) data.allowances = new Decimal(dto.allowances);
    if (dto.deductions !== undefined) data.deductions = new Decimal(dto.deductions);
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    const updated = await this.prisma.payrollEmployee.update({
      where: { id },
      data,
      include: { entity: true },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'PAYROLL_EMPLOYEE_UPDATED',
      resourceType: 'PayrollEmployee',
      resourceId: updated.id,
      metadata: { ...dto },
    });

    return updated;
  }

  async deleteEmployee(id: string, organizationId: string, userId: string) {
    const employee = await this.prisma.payrollEmployee.findFirst({
      where: { id, organizationId },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    // Deactivate rather than destructive delete to preserve historical integrity
    await this.prisma.payrollEmployee.update({
      where: { id },
      data: { isActive: false },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'PAYROLL_EMPLOYEE_DEACTIVATED',
      resourceType: 'PayrollEmployee',
      resourceId: id,
      metadata: { name: employee.name, code: employee.employeeCode },
    });

    return { success: true, message: 'Employee deactivated successfully' };
  }
}
