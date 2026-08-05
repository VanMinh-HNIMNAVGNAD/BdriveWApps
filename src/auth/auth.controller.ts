import { Controller, Post, Get, Body, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GetUser } from './decorators/get-user.decorator';
import { User } from '../entities/user.entity';

@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) { }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Req() req: Request, @Res() res: Response) {
    return this.authService.login(loginDto, req, res);
  }

  @Post('refresh')
  async refreshToken(@Req() req: Request) {
    return this.authService.refreshToken(req);
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res() res: Response) {
    return this.authService.logout(req, res);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@GetUser() user: User) {
    return this.authService.getProfile(user);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Initiates Google OAuth2 authentication flow
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
    const user = req.user as User;
    const frontendUrl = this.configService.get<string>('app.frontendUrl');
    if (!user) {
      return res.redirect(`${frontendUrl}/login?error=oauth_failed`);
    }

    return this.authService.handleOAuthSuccess(user, req, res);
  }

  @Get('github')
  @UseGuards(AuthGuard('github'))
  async githubAuth() {
    // Initiates GitHub OAuth2 authentication flow
  }

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubAuthRedirect(@Req() req: Request, @Res() res: Response) {
    const user = req.user as User;
    const frontendUrl = this.configService.get<string>('app.frontendUrl');
    if (!user) {
      return res.redirect(`${frontendUrl}/login?error=oauth_failed`);
    }

    return this.authService.handleOAuthSuccess(user, req, res);
  }

  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  async facebookAuth() {
    // Initiates Facebook OAuth2 authentication flow
  }

  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  async facebookAuthRedirect(@Req() req: Request, @Res() res: Response) {
    const user = req.user as User;
    const frontendUrl = this.configService.get<string>('app.frontendUrl');
    if (!user) {
      return res.redirect(`${frontendUrl}/login?error=oauth_failed`);
    }

    return this.authService.handleOAuthSuccess(user, req, res);
  }
}

@Controller('auth')
export class OAuthRootController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) { }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
    const user = req.user as User;
    const frontendUrl = this.configService.get<string>('app.frontendUrl');
    if (!user) {
      return res.redirect(`${frontendUrl}/login?error=oauth_failed`);
    }

    return this.authService.handleOAuthSuccess(user, req, res);
  }

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubAuthRedirect(@Req() req: Request, @Res() res: Response) {
    const user = req.user as User;
    const frontendUrl = this.configService.get<string>('app.frontendUrl');
    if (!user) {
      return res.redirect(`${frontendUrl}/login?error=oauth_failed`);
    }

    return this.authService.handleOAuthSuccess(user, req, res);
  }

  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  async facebookAuthRedirect(@Req() req: Request, @Res() res: Response) {
    const user = req.user as User;
    const frontendUrl = this.configService.get<string>('app.frontendUrl');
    if (!user) {
      return res.redirect(`${frontendUrl}/login?error=oauth_failed`);
    }

    return this.authService.handleOAuthSuccess(user, req, res);
  }
}