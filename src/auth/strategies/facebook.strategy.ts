import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-facebook';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    // Đọc từ nested config (map từ FACEBOOK_* trong .env root qua configuration.ts)
    const clientID = configService.get<string>('oauth.facebook.clientId');
    const clientSecret = configService.get<string>('oauth.facebook.clientSecret');
    const callbackURL =
      configService.get<string>('oauth.facebook.callbackUrl') ??
      'http://localhost:5000/api/v1/auth/facebook/callback';

    if (!clientID || !clientSecret) {
      throw new Error(
        '[FacebookStrategy] FACEBOOK_APP_ID / FACEBOOK_APP_SECRET chưa được cấu hình trong .env root. Backend không thể khởi động.',
      );
    }

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'public_profile'],
      profileFields: ['id', 'emails', 'name', 'displayName', 'photos'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: Function,
  ): Promise<any> {
    const { id, emails, photos, displayName, name } = profile;

    // Guard: Facebook có thể không trả email trong một số edge case (tài khoản đăng ký bằng SĐT, chặn quyền)
    const email = emails && emails.length > 0 ? emails[0].value : null;
    if (!email) {
      return done(
        new Error('Tài khoản Facebook không cung cấp địa chỉ email. Vui lòng dùng phương thức đăng nhập khác.'),
        false,
      );
    }

    // Xử lý fullName: displayName hoặc ghép từ name.givenName + name.familyName
    let fullName = 'Facebook User';
    if (displayName) {
      fullName = displayName;
    } else if (name && (name.givenName || name.familyName)) {
      fullName = `${name.givenName || ''} ${name.familyName || ''}`.trim();
    }

    const user = await this.authService.validateOAuthUser({
      provider: 'facebook',
      providerId: id,
      email,
      fullName,
      avatarUrl: photos && photos.length > 0 ? photos[0].value : null,
    });

    done(null, user);
  }
}
