import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    // Đọc từ nested config (map từ GOOGLE_* trong .env root qua configuration.ts)
    // Fail-fast: thiếu clientID hoặc clientSecret → crash ngay lúc boot, không âm thầm dùng key lộ
    const clientID = configService.get<string>('oauth.google.clientId');
    const clientSecret = configService.get<string>('oauth.google.clientSecret');
    const callbackURL =
      configService.get<string>('oauth.google.callbackUrl') ??
      'http://localhost:5000/api/v1/auth/google/callback';

    if (!clientID || !clientSecret) {
      throw new Error(
        '[GoogleStrategy] GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET chưa được cấu hình trong .env root. Backend không thể khởi động.',
      );
    }

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { emails, photos, id, displayName } = profile;

    // Guard: Google có thể không trả email trong một số edge case (tài khoản cũ, chính sách)
    const email = emails && emails.length > 0 ? emails[0].value : null;
    if (!email) {
      return done(
        new Error('Tài khoản Google không cung cấp địa chỉ email. Vui lòng dùng phương thức đăng nhập khác.'),
        false,
      );
    }

    const user = await this.authService.validateOAuthUser({
      provider: 'google',
      providerId: id,
      email,
      fullName: displayName ?? 'Google User',
      avatarUrl: photos && photos[0] ? photos[0].value : null,
    });

    done(null, user);
  }
}
