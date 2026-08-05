import 'reflect-metadata';
import { plainToInstance, Transform } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, validateSync, Min, IsNotEmpty } from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  // ── 1. App Group (Optional with defaults) ──
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @Min(1)
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : 5000))
  PORT: number = 5000;

  @IsString()
  @IsOptional()
  FRONTEND_URL: string = 'http://localhost:5173';

  @IsString()
  @IsOptional()
  CORS_ORIGINS: string = 'http://localhost:5173,http://127.0.0.1:5173';

  @IsString()
  @IsOptional()
  VITE_API_BASE_URL: string = 'http://localhost:5000/api/v1';

  // ── 2. Database Group (Required - Fail fast) ──
  @IsString()
  @IsNotEmpty({ message: 'DB_HOST is required' })
  DB_HOST!: string;

  @IsNumber()
  @Transform(({ value }) => (value ? parseInt(value, 10) : NaN))
  @IsNotEmpty({ message: 'DB_PORT is required' })
  DB_PORT!: number;

  @IsString()
  @IsNotEmpty({ message: 'DB_USERNAME is required' })
  DB_USERNAME!: string;

  @IsString()
  @IsOptional()
  DB_PASSWORD?: string;

  @IsString()
  @IsNotEmpty({ message: 'DB_DATABASE is required' })
  DB_DATABASE!: string;

  // ── 3. JWT Group (Required - Fail fast) ──
  @IsString()
  @IsNotEmpty({ message: 'JWT_SECRET is required' })
  JWT_SECRET!: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRATION: string = '15m';

  @IsString()
  @IsNotEmpty({ message: 'JWT_REFRESH_SECRET is required' })
  JWT_REFRESH_SECRET!: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRATION: string = '7d';

  // ── 4. OAuth Google Group (Required - Fail fast) ──
  @IsString()
  @IsNotEmpty({ message: 'GOOGLE_CLIENT_ID is required' })
  GOOGLE_CLIENT_ID!: string;

  @IsString()
  @IsNotEmpty({ message: 'GOOGLE_CLIENT_SECRET is required' })
  GOOGLE_CLIENT_SECRET!: string;

  @IsString()
  @IsOptional()
  GOOGLE_CALLBACK_URL: string = 'http://localhost:5000/api/v1/auth/google/callback';

  // ── 5. OAuth GitHub Group (Required - Fail fast) ──
  @IsString()
  @IsNotEmpty({ message: 'GITHUB_CLIENT_ID is required' })
  GITHUB_CLIENT_ID!: string;

  @IsString()
  @IsNotEmpty({ message: 'GITHUB_CLIENT_SECRET is required' })
  GITHUB_CLIENT_SECRET!: string;

  @IsString()
  @IsOptional()
  GITHUB_CALLBACK_URL: string = 'http://localhost:5000/api/v1/auth/github/callback';

  // ── 6. OAuth Facebook Group (Required - Fail fast) ──
  @IsString()
  @IsNotEmpty({ message: 'FACEBOOK_APP_ID is required' })
  FACEBOOK_APP_ID!: string;

  @IsString()
  @IsNotEmpty({ message: 'FACEBOOK_APP_SECRET is required' })
  FACEBOOK_APP_SECRET!: string;

  @IsString()
  @IsOptional()
  FACEBOOK_CALLBACK_URL: string = 'http://localhost:5000/auth/facebook/callback';

  // ── 7. Storage Group (Optional with defaults) ──
  @IsString()
  @IsOptional()
  STORAGE_PROVIDER: string = 'google_cloud';

  @IsString()
  @IsOptional()
  GCS_BUCKET_NAME?: string;

  @IsString()
  @IsOptional()
  GCS_KEY_FILE_PATH: string = './config/google-service-account.json';

  @IsString()
  @IsOptional()
  CLOUDFLARE_R2_ENDPOINT?: string;

  @IsString()
  @IsOptional()
  CLOUDFLARE_R2_ACCESS_KEY_ID?: string;

  @IsString()
  @IsOptional()
  CLOUDFLARE_R2_SECRET_ACCESS_KEY?: string;

  @IsString()
  @IsOptional()
  CLOUDFLARE_R2_BUCKET_NAME?: string;

  @IsString()
  @IsOptional()
  CLOUDFLARE_R2_REGION?: string;

  @IsString()
  @IsOptional()
  B2_ENDPOINT?: string;

  @IsString()
  @IsOptional()
  B2_ACCESS_KEY_ID?: string;

  @IsString()
  @IsOptional()
  B2_SECRET_ACCESS_KEY?: string;

  @IsString()
  @IsOptional()
  B2_BUCKET_NAME?: string;

  @IsString()
  @IsOptional()
  B2_REGION?: string;
}

export function validateConfig(config: Record<string, unknown>) {
  // Rào chắn VITE_* không chứa secret / private key
  for (const [key, value] of Object.entries(config)) {
    if (key.startsWith('VITE_')) {
      const keyLower = key.toLowerCase();
      if (
        keyLower.includes('secret') ||
        keyLower.includes('private') ||
        keyLower.includes('password') ||
        keyLower.includes('key_file')
      ) {
        throw new Error(
          `[Config Security Barrier] Biến '${key}' có prefix VITE_ nhưng lại chứa nhãn nhạy cảm (secret/private). VITE_ vars được đóng gói công khai lên client.`,
        );
      }
    }
  }

  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors
      .map((err) => {
        const constraints = Object.values(err.constraints || {}).join(', ');
        return `${err.property}: ${constraints}`;
      })
      .join('\n  - ');
    throw new Error(`[Config Validation Error] Thiếu hoặc sai cấu hình biến môi trường:\n  - ${errorMessages}`);
  }

  return validatedConfig;
}
