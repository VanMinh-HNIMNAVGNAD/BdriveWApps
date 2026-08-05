import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController, OAuthRootController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { GithubStrategy } from './strategies/github.strategy';
import { FacebookStrategy } from './strategies/facebook.strategy';
import { User } from '../entities/user.entity';
import { UserSession } from '../entities/user-session.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserSession]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'driver_super_secret_access_key_2026',
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [AuthController, OAuthRootController],
  providers: [AuthService, JwtStrategy, GoogleStrategy, GithubStrategy, FacebookStrategy],
  exports: [AuthService, JwtStrategy, PassportModule],
})
export class AuthModule {}
