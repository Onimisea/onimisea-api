import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AllExceptionsFilter } from '../shared/filters/axios-errors.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;
  const base_url = configService.get('BASE_URL');

  const config = new DocumentBuilder()
    .setTitle('Onimisea API')
    .setDescription('Backend API for Onimisea')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  document.servers = [{ url: 'v1' }];
  SwaggerModule.setup('/', app, document);

  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: [
      'Content-Type',
      'Content-Length',
      'Cookie',
      'Referer',
      'User-Agent',
      'Authorization',
    ],
    exposedHeaders: ['Authorization'],
    credentials: true,
  });

  app.use(helmet());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(compression());
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );
  app.use('/', express.static('public/general'));

  app.setGlobalPrefix('v2');
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(port);

  console.log('---------------------------------');
  console.log(`Server running at ${base_url}:${port}`);
  console.log('---------------------------------');
}
bootstrap();
