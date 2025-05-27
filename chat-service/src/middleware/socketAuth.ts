import { Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';
import jwt from 'jsonwebtoken';
import config from '../config/config';
import { logger } from '../utils';
import { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from '../types/socket.types';

interface TokenPayload {
    id: string;
    name: string;
    email: string;
    iat?: number;
    exp?: number;
}

export const socketAuthMiddleware = (
    socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
    next: (err?: ExtendedError) => void
) => {
    try {
        const token = socket.handshake.auth.token;

        if (!token) {
            return next(new Error('Authentication token missing'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, config.JWT_SECRET) as TokenPayload;
        if (decoded && decoded.id) {
            // Store user data in socket.data instead of socket.user
            socket.data.user = {
                id: decoded.id,
                name: decoded.name,
                email: decoded.email
            };
            logger.info(`Socket authenticated for user: ${decoded.id}`);
            next();
        } else {
            next(new Error('Invalid token'));
        }
    } catch (error) {
        logger.error('Socket authentication error:', error);
        next(new Error('Authentication failed'));
    }
};