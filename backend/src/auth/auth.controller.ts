import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyDto } from './dto/verify.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';

const REFRESH_COOKIE = 'devsocial_refresh';

function parseCookies(header?: string): Record<string, string> {
  if (!header) return {};
  return header.split(';').reduce<Record<string, string>>((cookies, entry) => {
    const index = entry.indexOf('=');
    if (index < 0) return cookies;
    const key = entry.slice(0, index).trim();
    const value = entry.slice(index + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
    return cookies;
  }, {});
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private cookieOptions() {
    const configured = (process.env.AUTH_COOKIE_SAME_SITE || 'lax').toLowerCase();
    const sameSite: 'lax' | 'strict' | 'none' =
      configured === 'none' || configured === 'strict' ? configured : 'lax';

    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' || sameSite === 'none',
      sameSite,
      path: '/api/v2/auth',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      ...(process.env.AUTH_COOKIE_DOMAIN ? { domain: process.env.AUTH_COOKIE_DOMAIN } : {}),
    } as const;
  }

  private setRefreshCookie(res: Response, refreshToken: string) {
    res.cookie(REFRESH_COOKIE, refreshToken, this.cookieOptions());
  }

  private clearRefreshCookie(res: Response) {
    const { maxAge: _maxAge, ...options } = this.cookieOptions();
    res.clearCookie(REFRESH_COOKIE, options);
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(loginDto);
    this.setRefreshCookie(res, result.session.refresh_token);

    return {
      user: result.user,
      session: {
        access_token: result.session.access_token,
        expires_at: result.session.expires_at,
      },
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    const refreshToken = parseCookies(req.headers?.cookie)[REFRESH_COOKIE];
    if (!refreshToken) throw new UnauthorizedException('No refresh session');

    const result = await this.authService.refreshSession(refreshToken);
    this.setRefreshCookie(res, result.session.refresh_token);

    return {
      user: result.user,
      session: {
        access_token: result.session.access_token,
        expires_at: result.session.expires_at,
      },
    };
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verify(@Body() verifyDto: VerifyDto) {
    return this.authService.verifyOtp(verifyDto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('dev/verify')
  @HttpCode(HttpStatus.OK)
  async devVerify(@Body() body: { email: string }) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Not allowed in production');
    }
    return this.authService.devVerifyUser(body.email);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() req: any) {
    return this.authService.getMe(req.user.id);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.id, dto);
  }

  @Delete('delete-account')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteAccount(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.deleteAccount(req.user.id);
    this.clearRefreshCookie(res);
    return result;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.logoutCurrent(req.authToken);
    this.clearRefreshCookie(res);
    return result;
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  async getSessions(@Req() req: any) {
    return this.authService.getSessions(req.authToken, req.authSessionId);
  }

  @Delete('sessions/:sessionId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logoutSession(
    @Req() req: any,
    @Param('sessionId') sessionId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.logoutSession(req.authToken, sessionId, req.authSessionId);
    this.clearRefreshCookie(res);
    return result;
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logoutAll(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.logoutAll(req.authToken);
    this.clearRefreshCookie(res);
    return result;
  }
}
