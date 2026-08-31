import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AssetsService } from './assets.service';
import { DepreciationService } from './depreciation.service';
import { DisposalService } from './disposal.service';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role, AssetStatus } from '@prisma/client';
import { CreateAssetCategoryDto, UpdateAssetCategoryDto } from './dto/category.dto';
import { CreateFixedAssetDto, UpdateFixedAssetDto, CapitalizeFixedAssetDto } from './dto/asset.dto';
import { CreateDepreciationRunDto, CreateAssetMovementDto, CreateAssetDisposalDto } from './dto/lifecycle.dto';

@Controller('api/v1/assets')
@UseGuards(SessionAuthGuard, TenantGuard, RolesGuard)
export class AssetsController {
  constructor(
    private readonly assetsService: AssetsService,
    private readonly depreciationService: DepreciationService,
    private readonly disposalService: DisposalService,
  ) {}

  // ==========================================
  // 1. ASSET CATEGORIES
  // ==========================================

  @Get('categories')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async listCategories(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('entityId') entityId: string,
  ) {
    return await this.assetsService.listCategories(orgId, entityId);
  }

  @Post('categories')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async createCategory(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('entityId') entityId: string,
    @Body() dto: CreateAssetCategoryDto,
  ) {
    return await this.assetsService.createCategory(orgId, entityId, dto);
  }

  @Get('categories/:id')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getCategory(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('entityId') entityId: string,
    @Param('id') id: string,
  ) {
    return await this.assetsService.getCategory(orgId, entityId, id);
  }

  @Patch('categories/:id')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async updateCategory(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('entityId') entityId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAssetCategoryDto,
  ) {
    return await this.assetsService.updateCategory(orgId, entityId, id, dto);
  }

  // ==========================================
  // 2. FIXED ASSET REGISTER & REPORTS
  // ==========================================

  @Get('register')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getAssetRegister(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('entityId') entityId: string,
    @Query('status') status?: AssetStatus,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
  ) {
    return await this.assetsService.listAssets(orgId, entityId, { status, categoryId, search });
  }

  @Get('reconciliation')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getReconciliation(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('entityId') entityId: string,
  ) {
    return await this.assetsService.getReconciliation(orgId, entityId);
  }

  @Get()
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async listAssets(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('entityId') entityId: string,
    @Query('status') status?: AssetStatus,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
  ) {
    return await this.assetsService.listAssets(orgId, entityId, { status, categoryId, search });
  }

  @Post()
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async createAsset(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('entityId') entityId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateFixedAssetDto,
  ) {
    return await this.assetsService.createAsset(orgId, entityId, dto, userId);
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async getAsset(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('entityId') entityId: string,
    @Param('id') id: string,
  ) {
    return await this.assetsService.getAsset(orgId, entityId, id);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async updateAsset(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('entityId') entityId: string,
    @Param('id') id: string,
    @Body() dto: UpdateFixedAssetDto,
  ) {
    return await this.assetsService.updateAsset(orgId, entityId, id, dto);
  }

  @Post(':id/capitalize')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async capitalizeAsset(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('entityId') entityId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: CapitalizeFixedAssetDto,
  ) {
    return await this.assetsService.capitalizeAsset(orgId, entityId, id, dto, userId);
  }

  // ==========================================
  // 3. MOVEMENTS / TRANSFERS
  // ==========================================

  @Post(':id/move')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async moveAsset(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('entityId') entityId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: CreateAssetMovementDto,
  ) {
    return await this.assetsService.recordMovement(orgId, entityId, id, dto, userId);
  }

  @Get('movements/all')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async listMovements(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('entityId') entityId: string,
    @Query('assetId') assetId?: string,
  ) {
    return await this.assetsService.listMovements(orgId, entityId, assetId);
  }

  // ==========================================
  // 4. DEPRECIATION RUNS
  // ==========================================

  @Get('depreciation-runs/all')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async listDepreciationRuns(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('entityId') entityId: string,
  ) {
    return await this.depreciationService.listRuns(orgId, entityId);
  }

  @Post('depreciation-runs/calculate')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR)
  async calculateDepreciationRun(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('entityId') entityId: string,
    @Body() dto: CreateDepreciationRunDto,
  ) {
    return await this.depreciationService.calculateRun(orgId, entityId, dto.periodYear, dto.periodMonth);
  }

  @Post('depreciation-runs/post')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async postDepreciationRun(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('entityId') entityId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateDepreciationRunDto,
  ) {
    return await this.depreciationService.postRun(orgId, entityId, dto.periodYear, dto.periodMonth, userId);
  }

  @Post('depreciation-runs/:id/reverse')
  @Roles(Role.OWNER, Role.ADMIN)
  async reverseDepreciationRun(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('entityId') entityId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return await this.depreciationService.reverseRun(orgId, entityId, id, userId);
  }

  // ==========================================
  // 5. DISPOSALS
  // ==========================================

  @Get('disposals/all')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT, Role.AUDITOR, Role.VIEWER)
  async listDisposals(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('entityId') entityId: string,
  ) {
    return await this.disposalService.listDisposals(orgId, entityId);
  }

  @Post(':id/dispose')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  async disposeAsset(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('entityId') entityId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: CreateAssetDisposalDto,
  ) {
    return await this.disposalService.disposeAsset(orgId, entityId, id, dto, userId);
  }
}
