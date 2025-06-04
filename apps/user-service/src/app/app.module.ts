import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { DatabaseModule } from '@chat/shared/infrastructure';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthService } from './services/auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env.docker', '.env.production', '.env'],
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET || 'your-secret-key',
        signOptions: {
          expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        },
      }),
    }),
    DatabaseModule,
  ],
  controllers: [AppController],
  providers: [AppService, AuthService, JwtStrategy, JwtAuthGuard],
  exports: [AuthService],
})
export class AppModule {}
