import { Injectable } from '@nestjs/common';
import { WebSocketJwtAuthService, AuthenticatedSocket, JwtPayload } from './websocket-jwt-auth.service';
import { Socket } from 'socket.io';

@Injectable()
export class WebSocketAuthService {
    constructor(
        private readonly jwtAuthService: WebSocketJwtAuthService,
    ) { }

    async authenticateSocket(client: Socket): Promise<AuthenticatedSocket> {
        try {
            return await this.jwtAuthService.authenticateSocket(client);
        } catch (error) {
            throw new Error(`Authentication failed: ${error.message}`);
        }
    }

    async validateToken(token: string): Promise<JwtPayload> {
        const payload = await this.jwtAuthService.validateToken(token);
        return payload;

    }

    async refreshToken(token: string): Promise<string> {
        return await this.jwtAuthService.refreshToken(token);
    }

    async validateUser(userId: string): Promise<boolean> {
        return await this.jwtAuthService.validateUser(userId);
    }
}
