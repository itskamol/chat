import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  // Create the main NestJS application
  const app = await NestFactory.create(AppModule);

  // Get configuration service
  const configService = app.get(ConfigService);

  // Enable CORS for WebSocket and HTTP
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    })
  );

  // Setup Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Chat Service API')
    .setDescription('Real-time chat service with room management and messaging')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // HTTP server for REST APIs
  const httpPort = process.env.HTTP_PORT || 3002;
  await app.listen(httpPort);
  Logger.log(
    `🚀 Chat service HTTP server listening on: http://localhost:${httpPort}`
  );
  Logger.log(
    `📚 API Documentation available at: http://localhost:${httpPort}/api/docs`
  );

  // Setup gRPC microservice
  const grpcPort = process.env.GRPC_PORT || 50052;
  const grpcApp = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.GRPC,
      options: {
        package: 'chat',
        protoPath: process.env.PROTO_PATH || 'protos/chat.proto',
        url: `0.0.0.0:${grpcPort}`,
        loader: {
          keepCase: true,
          longs: String,
          enums: String,
          defaults: true,
          oneofs: true,
        },
      },
    }
  );

  await grpcApp.listen();
  Logger.log(`🚀 Chat service gRPC server listening on port ${grpcPort}`);

  // Log WebSocket information
  Logger.log(
    `🔌 WebSocket server available at: ws://localhost:${httpPort}/chat`
  );
}

bootstrap().catch((error) => {
  Logger.error('Failed to start chat service:', error);
  process.exit(1);
});
