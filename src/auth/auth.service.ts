import { Injectable, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { Response, Request } from 'express';
import { User } from '../entities/user.entity';
import { UserSession } from '../entities/user-session.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserSession)
    private sessionRepository: Repository<UserSession>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.userRepository.findOne({ where: { email: registerDto.email } });
    if (existingUser) {
      throw new ConflictException('Email này đã được sử dụng');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(registerDto.password, salt);

    const newUser = this.userRepository.create({
      email: registerDto.email,
      passwordHash,
      fullName: registerDto.fullName,
      provider: 'local',
      role: 'USER',
      storageUsedBytes: 0,
      storageLimitBytes: 2147483648, // 2 GB
    });

    await this.userRepository.save(newUser);

    const { passwordHash: _, ...userWithoutPassword } = newUser;
    return {
      message: 'Đăng ký tài khoản thành công',
      user: userWithoutPassword,
    };
  }

  async login(loginDto: LoginDto, req: Request, res: Response) {
    const user = await this.userRepository.findOne({ where: { email: loginDto.email } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Tài khoản của bạn đã bị khóa');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    // Update lastLoginAt & Unhibernate account if it was hibernated
    user.lastLoginAt = new Date();
    if (user.isHibernated) {
      user.isHibernated = false;
      user.storageLimitBytes = 2147483648; // Restore 2GB default quota
    }
    await this.userRepository.save(user);

    // Generate Tokens
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET') || 'driver_super_secret_access_key_2026',
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'driver_super_secret_refresh_key_2026',
      expiresIn: '7d',
    });

    // Hash refresh token to store in session
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Save session in DB
    const session = this.sessionRepository.create({
      userId: user.id,
      refreshTokenHash,
      userAgent: req.headers['user-agent'] || 'Unknown Device',
      ipAddress: req.ip || '127.0.0.1',
      expiresAt,
      isRevoked: false,
    });
    await this.sessionRepository.save(session);

    // Set Refresh Token in HttpOnly Cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: false, // Set true in HTTPS production
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    const { passwordHash: _, ...userWithoutPassword } = user;

    return res.status(200).json({
      message: 'Đăng nhập thành công',
      accessToken,
      user: {
        ...userWithoutPassword,
        storageInfo: {
          usedBytes: Number(user.storageUsedBytes),
          limitBytes: Number(user.storageLimitBytes),
          usedGB: (Number(user.storageUsedBytes) / (1024 * 1024 * 1024)).toFixed(2),
          limitGB: (Number(user.storageLimitBytes) / (1024 * 1024 * 1024)).toFixed(2),
          percentage: Math.round((Number(user.storageUsedBytes) / Number(user.storageLimitBytes)) * 100),
        },
      },
    });
  }

  async refreshToken(req: Request) {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException('Không tìm thấy Refresh Token trong Cookie');
    }

    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'driver_super_secret_refresh_key_2026',
      });

      const user = await this.userRepository.findOne({ where: { id: payload.sub, isActive: true } });
      if (!user) {
        throw new UnauthorizedException('Người dùng không tồn tại');
      }

      // Generate new access token
      const newAccessToken = this.jwtService.sign(
        { sub: user.id, email: user.email, role: user.role },
        {
          secret: this.configService.get<string>('JWT_SECRET') || 'driver_super_secret_access_key_2026',
          expiresIn: '15m',
        },
      );

      return {
        accessToken: newAccessToken,
      };
    } catch {
      throw new UnauthorizedException('Refresh Token không hợp lệ hoặc đã hết hạn');
    }
  }

  async logout(req: Request, res: Response) {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      try {
        const payload = this.jwtService.decode(refreshToken) as any;
        if (payload?.sub) {
          await this.sessionRepository.update({ userId: payload.sub }, { isRevoked: true });
        }
      } catch {
        // Ignore token decoding error during logout
      }
    }

    res.clearCookie('refreshToken');
    return res.status(200).json({ message: 'Đăng xuất thành công' });
  }

  async getProfile(user: User) {
    const { passwordHash: _, ...userWithoutPassword } = user;
    return {
      user: {
        ...userWithoutPassword,
        storageInfo: {
          usedBytes: Number(user.storageUsedBytes),
          limitBytes: Number(user.storageLimitBytes),
          usedGB: (Number(user.storageUsedBytes) / (1024 * 1024 * 1024)).toFixed(2),
          limitGB: (Number(user.storageLimitBytes) / (1024 * 1024 * 1024)).toFixed(2),
          percentage: Math.round((Number(user.storageUsedBytes) / Number(user.storageLimitBytes)) * 100),
        },
      },
    };
  }

  async handleOAuthSuccess(user: User, req: Request, res: Response) {
    user.lastLoginAt = new Date();
    if (user.isHibernated) {
      user.isHibernated = false;
      user.storageLimitBytes = 2147483648;
    }
    await this.userRepository.save(user);

    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET') || 'driver_super_secret_access_key_2026',
      expiresIn: '7d',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'driver_super_secret_refresh_key_2026',
      expiresIn: '7d',
    });

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const session = this.sessionRepository.create({
      userId: user.id,
      refreshTokenHash,
      userAgent: req.headers['user-agent'] || 'Unknown Device',
      ipAddress: req.ip || '127.0.0.1',
      expiresAt,
      isRevoked: false,
    });
    await this.sessionRepository.save(session);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/app?token=${accessToken}`);
  }

  async validateOAuthUser(profile: { provider: string; providerId: string; email: string; fullName: string; avatarUrl?: string | null }) {
    if (!profile.email) {
      throw new BadRequestException('Không tìm thấy email từ nhà cung cấp ' + profile.provider);
    }

    let user = await this.userRepository.findOne({ where: { email: profile.email } });

    if (user) {
      user.provider = profile.provider;
      user.providerId = profile.providerId;
      
      // Always update avatarUrl if OAuth provides one
      if (profile.avatarUrl) {
        user.avatarUrl = profile.avatarUrl;
      }
      
      user.lastLoginAt = new Date();
      if (user.isHibernated) {
        user.isHibernated = false;
        user.storageLimitBytes = 2147483648;
      }
      await this.userRepository.save(user);
    } else {
      user = this.userRepository.create({
        email: profile.email,
        fullName: profile.fullName,
        avatarUrl: profile.avatarUrl || undefined,
        provider: profile.provider,
        providerId: profile.providerId,
        storageUsedBytes: 0,
        storageLimitBytes: 2147483648,
        lastLoginAt: new Date(),
        role: 'USER',
      });
      await this.userRepository.save(user);
    }

    return user;
  }
}
