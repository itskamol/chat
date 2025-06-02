import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { Logger } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Setup for gRPC server (FR-PS-004)
  const grpcPort = process.env.GRPC_PORT || 50054; // Ensure unique port
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'presence', // Package name from your .proto file
      protoPath: 'path/to/your/presence.proto', // Path to .proto
      url: `0.0.0.0:${grpcPort}`,
    },
  });

  // Optional: Setup for RabbitMQ listener (FR-PS-003, if consuming gateway events via RMQ)
  // app.connectMicroservice<MicroserviceOptions>({
  //   transport: Transport.RMQ,
  //   options: {
  //     urls: ['amqp://localhost:5672'], // From config
  //     queue: 'presence_service_queue', // Queue for events targeted at presence service
  //     queueOptions: { durable: true },
  //     prefetchCount: 1, // Process one message at a time
  //   },
  // });

  await app.startAllMicroservices();
  Logger.log(`🚀 Presence service gRPC listening on port ${grpcPort}`);
  // if RMQ listener active: Logger.log('🚀 Presence service RMQ listener started');


  // Optional: Start HTTP server if AppController has HTTP routes (e.g., health check)
  const httpPort = process.env.HTTP_PORT || 3004; // Ensure unique port
  await app.listen(httpPort);
  Logger.log(
    `🚀 Presence service HTTP (if any routes exist) listening on: http://localhost:${httpPort}`
  );
}
bootstrap();
