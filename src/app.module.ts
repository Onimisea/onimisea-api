import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerMiddleware } from '../shared/middlewares/logger.middleware';
import { LoggerInterceptor } from '../shared/interceptors/logger.interceptor';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import AxioService from '../shared/axios.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // TypeOrmModule.forRootAsync({
    //   imports: [ConfigModule],
    //   inject: [ConfigService],
    //   useFactory: async (configService: ConfigService) => ({
    //     type: 'postgres',
    //     host: configService.getOrThrow('DB_HOST') || 'localhost',
    //     port: configService.getOrThrow<number>('DB_PORT') || 5432,
    //     username: configService.getOrThrow('DB_USERNAME') || 'root',
    //     password: configService.getOrThrow('DB_PASSWORD') || 'root',
    //     database: configService.getOrThrow('DB_DATABASE') || 'dev',
    //     entities: [__dirname + '/**/*.entity{.ts,.js}'],
    //     synchronize: configService.getOrThrow('DB_SYNC') || false,
    //     ssl: {
    //       rejectUnauthorized: false, // If you don't need to verify the server's SSL certificate
    //     },
    //   }),
    // }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    PassportModule,
    // UsersModule,
    // AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // JwtStrategy,
    JwtService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },

    {
      provide: APP_INTERCEPTOR,
      useClass: LoggerInterceptor,
    },
    AxioService,
  ],
})
// export class AppModule {}
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
    // .apply(AuthMiddleware)
    // .forRoutes('/users/', '/products/', '/admin/');
  }
}
