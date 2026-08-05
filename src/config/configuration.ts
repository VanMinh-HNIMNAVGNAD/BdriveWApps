export default () => ({
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '5000', 10),
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173').split(','),
    viteApiBaseUrl: process.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
  },
  database: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiration: process.env.JWT_EXPIRATION || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  },
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/v1/auth/google/callback',
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackUrl: process.env.GITHUB_CALLBACK_URL || 'http://localhost:5000/api/v1/auth/github/callback',
    },
    facebook: {
      clientId: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackUrl: process.env.FACEBOOK_CALLBACK_URL || 'http://localhost:5000/api/v1/auth/facebook/callback',
    },
  },
  storage: {
    provider: process.env.STORAGE_PROVIDER || 'google_cloud',
    gcs: {
      bucketName: process.env.GCS_BUCKET_NAME,
      keyFilePath: process.env.GCS_KEY_FILE_PATH || './config/google-service-account.json',
    },
    r2: {
      endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
      bucketName: process.env.CLOUDFLARE_R2_BUCKET_NAME,
      region: process.env.CLOUDFLARE_R2_REGION || 'auto',
    },
    b2: {
      endpoint: process.env.B2_ENDPOINT,
      accessKeyId: process.env.B2_ACCESS_KEY_ID,
      secretAccessKey: process.env.B2_SECRET_ACCESS_KEY,
      bucketName: process.env.B2_BUCKET_NAME,
      region: process.env.B2_REGION,
    },
  },
});
