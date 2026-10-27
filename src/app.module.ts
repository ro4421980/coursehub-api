import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoursesModule } from './courses/courses.module.js';
import { EnrollmentsModule } from './enrollments/enrollments.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { WelcomeController } from './welcome.controller.js';
import { WelcomeService } from './welcome.service.js';
import { AuthModule } from './auth/auth.module.js';
import {
  createTypeOrmOptions,
  environmentValidationSchema,
} from './config/database.config.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: environmentValidationSchema,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: createTypeOrmOptions,
    }),
    CoursesModule,
    EnrollmentsModule,
    AuthModule,
  ],
  controllers: [AppController, WelcomeController],
  providers: [AppService, WelcomeService],
})
export class AppModule {}