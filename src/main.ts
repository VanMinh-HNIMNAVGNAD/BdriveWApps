import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AppValidationPipe } from './common/pipes/app-validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const corsOrigins = configService.get<string[]>('app.corsOrigins') || [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ];

  // Enable CORS with Credentials for HttpOnly Cookie
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Enable Cookie Parser middleware
  app.use(cookieParser());

  // Enable Global App Validation Pipe
  app.useGlobalPipes(new AppValidationPipe());

  const port = configService.get<number>('app.port') || 5000;
  await app.listen(port);
  console.log(`🚀 Backend NestJS Server is running on: http://localhost:${port}`);
}

bootstrap();
