import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Get config service
  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') || 3000;
  const environment = configService.get<string>('environment') || 'development';

  // Enable CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api', {
    exclude: ['health', 'api/docs'],
  });

  // API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger documentation
  if (environment !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('MyFuel API')
      .setDescription(
        `Fast-Logic Fleet Management Platform - Fuel Card Transaction System

## Overview
This API provides endpoints for managing fuel card transactions, organizations, and spending limits.

## Features
- Organization management with prepaid balance accounts
- Fuel card issuance and management
- Daily and monthly spending limits
- Real-time transaction validation
- Webhook integration for petrol stations
- Full audit trail with balance ledger

## Authentication
API endpoints require an API key passed in the \`x-api-key\` header.
Webhook endpoints require signature verification via \`x-webhook-signature\` header.
`,
      )
      .setVersion('1.0')
      .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'api-key')
      .addTag('organizations', 'Organization and balance management')
      .addTag('cards', 'Fuel card management')
      .addTag('transactions', 'Transaction history and details')
      .addTag('webhooks', 'Webhook endpoints for petrol stations')
      .addTag('health', 'Health check endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });

    logger.log(`Swagger documentation available at http://localhost:${port}/api/docs`);
  }

  // Start server
  await app.listen(port);
  logger.log(`🚀 MyFuel API is running on http://localhost:${port}`);
  logger.log(`Environment: ${environment}`);
}
bootstrap();
