import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('api/v1/organizations')
@UseGuards(SessionAuthGuard)
export class OrganizationsController {
  constructor(private organizationsService: OrganizationsService) {}

  @Get()
  async getMyOrganizations(@CurrentUser('id') userId: string) {
    return this.organizationsService.getUserOrganizations(userId);
  }

  @Get(':id')
  async getOrganizationById(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.organizationsService.getOrganizationById(id, userId);
  }

  @Post()
  async createOrganization(
    @Body() dto: CreateOrganizationDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.organizationsService.createOrganization(dto, userId);
  }
}
