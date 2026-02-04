import { Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';
import { CacheService } from './cache.service';

@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisHost = configService.get<string>('redis.host');
        const redisPort = configService.get<number>('redis.port');
        const redisPassword = configService.get<string>('redis.password');

        // If Redis is not configured, use in-memory cache
        if (!redisHost) {
          return {
            ttl: 3600 * 1000, // 1 hour default
          };
        }

        try {
          const store = await redisStore({
            socket: {
              host: redisHost,
              port: redisPort,
            },
            password: redisPassword || undefined,
          });

          return {
            store,
            ttl: 3600 * 1000, // 1 hour default
          };
        } catch (error) {
          console.warn('Failed to connect to Redis, using in-memory cache:', error.message);
          return {
            ttl: 3600 * 1000,
          };
        }
      },
      inject: [ConfigService],
    }),
  ],
  providers: [CacheService],
  exports: [NestCacheModule, CacheService],
})
export class CacheModule {}
