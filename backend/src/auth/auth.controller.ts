import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Ip,
  Headers,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SessionAuthGuard } from './guards/session-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';

@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  private setSessionCookie(res: Response, token: string, expiresAt: Date) {
    const isProduction = this.configService.get('nodeEnv') === 'production';
    const cookieSecure = this.configService.get('session.cookieSecure');

    res.cookie('finagrow_session', token, {
      httpOnly: true,
      secure: isProduction ? true : (cookieSecure || false),
      sameSite: isProduction ? 'none' : 'lax',
      expires: expiresAt,
      path: '/',
    });
  }

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const result = await this.authService.register(dto, ip, userAgent);
    this.setSessionCookie(res, result.sessionToken, result.expiresAt);
    return result;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const result = await this.authService.login(dto, ip, userAgent);
    this.setSessionCookie(res, result.sessionToken, result.expiresAt);
    return result;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SessionAuthGuard)
  async logout(
    @Req() req: Request & { sessionId?: string; user?: any },
    @CurrentTenant('id') orgId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.clearCookie('finagrow_session', { path: '/' });
    return this.authService.logout(req.sessionId, req.user?.id, orgId);
  }

  @Get('me')
  @UseGuards(SessionAuthGuard)
  async getMe(@CurrentUser('id') userId: string) {
    return this.authService.getMe(userId);
  }
}
