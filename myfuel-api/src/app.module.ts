import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Config & Database
import { ConfigModule } from './config';
import { DatabaseModule } from './database';
import { CacheModule } from './cache';

// Feature Modules
import { CommonModule } from './common';
import { HealthModule } from './health';
import { OrganizationsModule } from './modules/organizations';
import { CardsModule } from './modules/cards';
import { TransactionsModule } from './modules/transactions';
import { WebhooksModule } from './modules/webhooks';

// Messaging & Saga
import { MessagingModule } from './messaging';
import { SagaModule } from './saga';

@Module({
  imports: [
    // Configuration
    ConfigModule,
    DatabaseModule,
    CacheModule,

    // Common utilities
    CommonModule,

    // Health checks
    HealthModule,

    // Feature modules
    OrganizationsModule,
    CardsModule,
    TransactionsModule,
    WebhooksModule,

    // Messaging & Saga
    MessagingModule,
    SagaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
