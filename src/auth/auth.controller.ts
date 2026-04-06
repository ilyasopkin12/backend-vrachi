import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../shared/jwt-auth.guard';
import { CurrentUser } from '../shared/current-user.decorator';
import type { RequestUser } from './jwt.strategy';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.login(dto);
    this.setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = this.getRefreshTokenFromRequest(req);
    const { accessToken } =
      await this.authService.refreshAccessToken(refreshToken);
    this.setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: RequestUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.clearCookie('refreshToken', this.getRefreshCookieOptions());
    return this.authService.logout(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: RequestUser) {
    return this.authService.getMe(user.userId);
  }

  private getRefreshTokenFromRequest(req: Request): string {
    const rawCookie = req.headers.cookie;
    if (!rawCookie) {
      throw new UnauthorizedException('Refresh token is missing');
    }

    const refreshTokenCookie = rawCookie
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith('refreshToken='));

    if (!refreshTokenCookie) {
      throw new UnauthorizedException('Refresh token is missing');
    }

    return decodeURIComponent(refreshTokenCookie.slice('refreshToken='.length));
  }

  private setRefreshCookie(res: Response, refreshToken: string) {
    res.cookie('refreshToken', refreshToken, {
      ...this.getRefreshCookieOptions(),
      maxAge: this.getRefreshCookieMaxAgeMs(),
    });
  }

  private getRefreshCookieOptions() {
    return {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
      path: '/auth',
    };
  }

  private getRefreshCookieMaxAgeMs(): number {
    const rawDays = Number(process.env.JWT_REFRESH_COOKIE_DAYS || 7);
    const days = Number.isFinite(rawDays) && rawDays > 0 ? rawDays : 7;
    return days * 24 * 60 * 60 * 1000;
  }
}

