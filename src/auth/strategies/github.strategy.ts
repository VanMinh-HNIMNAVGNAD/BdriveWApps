import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    // Đọc từ nested config (map từ GITHUB_* trong .env root qua configuration.ts)
    // Sửa lỗi: trước đây dùng sai key 'API_URL' (không tồn tại) → phải dùng 'oauth.github.callbackUrl'
    // Fail-fast: thiếu clientID hoặc clientSecret → crash ngay lúc boot, không dùng fallback 'dummy'
    const clientID = configService.get<string>('oauth.github.clientId');
    const clientSecret = configService.get<string>('oauth.github.clientSecret');
    const callbackURL =
      configService.get<string>('oauth.github.callbackUrl') ??
      'http://localhost:5000/api/v1/auth/github/callback';

    if (!clientID || !clientSecret) {
      throw new Error(
        '[GithubStrategy] GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET chưa được cấu hình trong .env root. Backend không thể khởi động.',
      );
    }

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['user:email'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any, done: Function) {
    const { id, displayName, username, emails, photos } = profile;

    // Email: ưu tiên emails[0] từ scope 'user:email'
    // Fallback: noreply GitHub (trường hợp user để email private)
    // Tránh truyền chuỗi rỗng '' vào DB gây lỗi constraint
    const email =
      emails && emails.length > 0 && emails[0].value
        ? emails[0].value
        : `${id}+${username ?? 'user'}@users.noreply.github.com`;

    // Avatar: ưu tiên photos[0].value, fallback _json.avatar_url (một số account trả qua _json)
    const avatarUrl =
      (photos && photos.length > 0 ? photos[0].value : null) ??
      (profile._json?.avatar_url ?? null);

    const user = await this.authService.validateOAuthUser({
      provider: 'github',
      providerId: id,
      email,
      fullName: displayName || username || 'GitHub User',
      avatarUrl,
    });

    done(null, user);
  }
}
