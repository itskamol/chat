import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ChatGateway } from './chat.gateway';
import { WebSocketAuthService } from './websocket-auth.service';
import { WebSocketJwtAuthService } from './websocket-jwt-auth.service';
import { MessageModule } from '../message/message.module';
import { RoomModule } from '../room/room.module';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        forwardRef(() => MessageModule),
        forwardRef(() => RoomModule),
        AuthModule,
        ConfigModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET') || 'your-secret-key',
                signOptions: {
                    expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '24h',
                },
            }),
            inject: [ConfigService],
        }),
    ],
    providers: [ChatGateway, WebSocketAuthService, WebSocketJwtAuthService],
    exports: [ChatGateway, WebSocketAuthService, WebSocketJwtAuthService],
})
export class WebSocketModule { }
