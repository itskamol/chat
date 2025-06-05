import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';

export interface JwtPayload {
    sub: string;
    id: string;
    email: string;
    iat?: number;
    exp?: number;
}

export interface AuthenticatedSocket extends Socket {
    user?: {
        id: string;
        email: string;
    };
}

@Injectable()
export class WebSocketJwtAuthService {
    constructor(
        private jwtService: JwtService,
        private configService: ConfigService,
    ) { }

    async authenticateSocket(socket: Socket): Promise<AuthenticatedSocket> {
        try {
            const token = this.extractTokenFromSocket(socket);
            if (!token) {
                throw new UnauthorizedException('No token provided');
            }

            const payload = await this.validateToken(token);
            const authenticatedSocket = socket as AuthenticatedSocket;
            authenticatedSocket.user = {
                id: payload.sub,
                email: payload.email,
            };

            return authenticatedSocket;
        } catch (error) {
            throw new UnauthorizedException('Invalid token');
        }
    }

    private extractTokenFromSocket(socket: Socket): string | null {
        // Try multiple ways to get the token

        // 1. From query parameters
        const queryToken = socket.handshake.query?.token;
        if (queryToken && typeof queryToken === 'string') {
            return queryToken;
        }

        // 2. From headers
        const authHeader = socket.handshake.headers.authorization;
        if (authHeader) {
            const match = authHeader.match(/^Bearer\s+(.*)$/);
            if (match) {
                return match[1];
            }
        }

        // 3. From cookies (if using cookie-based auth)
        const cookies = socket.handshake.headers.cookie;
        if (cookies) {
            const match = cookies.match(/(?:^|;\s*)token=([^;]*)/);
            if (match) {
                return match[1];
            }
        }

        return null;
    }

    async validateToken(token: string): Promise<JwtPayload> {
        try {
            const secret = this.configService.get<string>('JWT_SECRET') || 'your-secret-key';
            const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
                secret,
            });

            if (!payload.sub || !payload.email) {
                throw new UnauthorizedException('Invalid token payload');
            }

            return payload;
        } catch (error) {
            throw new UnauthorizedException('Token verification failed');
        }
    }

    async refreshToken(token: string): Promise<string> {
        try {
            const payload = await this.validateToken(token);

            // Create new token with extended expiration
            const newPayload = {
                sub: payload.sub,
                email: payload.email,
            };

            const secret = this.configService.get<string>('JWT_SECRET') || 'your-secret-key';
            return this.jwtService.sign(newPayload, {
                secret,
                expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '24h',
            });
        } catch (error) {
            throw new UnauthorizedException('Token refresh failed');
        }
    }

    async validateUser(userId: string): Promise<boolean> {
        // Here you would typically check if the user exists in your database
        // For now, we'll assume all users with valid tokens are valid
        return true;
    }
}
