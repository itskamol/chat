import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { WebSocketJwtAuthService } from './websocket-jwt-auth.service';
import { Socket } from 'socket.io';

describe('WebSocketJwtAuthService', () => {
  let service: WebSocketJwtAuthService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockSocket = {
    handshake: {
      query: {},
      headers: {},
      auth: {},
    },
  } as Socket;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebSocketJwtAuthService,
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest.fn(),
            sign: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              const config = {
                JWT_SECRET: 'test-secret',
                JWT_EXPIRES_IN: '24h',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<WebSocketJwtAuthService>(WebSocketJwtAuthService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('authenticateSocket', () => {
    it('should authenticate socket with valid token from query', async () => {
      const mockPayload = {
        sub: 'user-1',
        email: 'test@example.com',
        iat: Date.now(),
        exp: Date.now() + 86400000,
      };

      mockSocket.handshake.query = { token: 'valid-token' };
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(mockPayload);

      const result = await service.authenticateSocket(mockSocket);

      expect(result.user).toEqual({
        id: 'user-1',
        email: 'test@example.com',
      });
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-token', {
        secret: 'test-secret',
      });
    });

    it('should authenticate socket with valid token from authorization header', async () => {
      const mockPayload = {
        sub: 'user-1',
        email: 'test@example.com',
      };

      mockSocket.handshake.headers = { authorization: 'Bearer valid-token' };
      mockSocket.handshake.query = {};
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(mockPayload);

      const result = await service.authenticateSocket(mockSocket);

      expect(result.user).toEqual({
        id: 'user-1',
        email: 'test@example.com',
      });
    });

    it('should authenticate socket with valid token from cookies', async () => {
      const mockPayload = {
        sub: 'user-1',
        email: 'test@example.com',
      };

      mockSocket.handshake.headers = { cookie: 'token=valid-token; other=value' };
      mockSocket.handshake.query = {};
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(mockPayload);

      const result = await service.authenticateSocket(mockSocket);

      expect(result.user).toEqual({
        id: 'user-1',
        email: 'test@example.com',
      });
    });

    it('should throw UnauthorizedException when no token provided', async () => {
      mockSocket.handshake.query = {};
      mockSocket.handshake.headers = {};

      await expect(service.authenticateSocket(mockSocket)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      mockSocket.handshake.query = { token: 'invalid-token' };
      jest.spyOn(jwtService, 'verifyAsync').mockRejectedValue(new Error('Invalid token'));

      await expect(service.authenticateSocket(mockSocket)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when payload is missing required fields', async () => {
      const mockPayload = {
        sub: 'user-1',
        // email is missing
      };

      mockSocket.handshake.query = { token: 'valid-token' };
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(mockPayload);

      await expect(service.authenticateSocket(mockSocket)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('validateToken', () => {
    it('should validate token and return payload', async () => {
      const mockPayload = {
        sub: 'user-1',
        email: 'test@example.com',
      };

      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(mockPayload);

      const result = await service.validateToken('valid-token');

      expect(result).toEqual(mockPayload);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-token', {
        secret: 'test-secret',
      });
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockRejectedValue(new Error('Invalid token'));

      await expect(service.validateToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refreshToken', () => {
    it('should refresh valid token', async () => {
      const mockPayload = {
        sub: 'user-1',
        email: 'test@example.com',
      };

      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(mockPayload);
      jest.spyOn(jwtService, 'sign').mockReturnValue('new-token');

      const result = await service.refreshToken('valid-token');

      expect(result).toBe('new-token');
      expect(jwtService.sign).toHaveBeenCalledWith(
        {
          sub: 'user-1',
          email: 'test@example.com',
        },
        {
          secret: 'test-secret',
          expiresIn: '24h',
        },
      );
    });

    it('should throw UnauthorizedException for invalid token during refresh', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockRejectedValue(new Error('Invalid token'));

      await expect(service.refreshToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('validateUser', () => {
    it('should return true for any user ID (placeholder implementation)', async () => {
      const result = await service.validateUser('user-1');
      expect(result).toBe(true);
    });
  });
});
