import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { Logger } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Setup for gRPC server (FR-FS-003)
  const grpcPort = process.env.GRPC_PORT || 50055; // Ensure unique port
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'file', // Package name from your .proto file
      protoPath: 'path/to/your/file.proto', // Path to .proto
      url: `0.0.0.0:${grpcPort}`,
    },
  });

  await app.startAllMicroservices();
  Logger.log(`🚀 File service gRPC listening on port ${grpcPort}`);

  // Optional: Start HTTP server if AppController has HTTP routes (e.g., health check)
  const httpPort = process.env.HTTP_PORT || 3005; // Ensure unique port
  await app.listen(httpPort);
  Logger.log(
    `🚀 File service HTTP (if any routes exist) listening on: http://localhost:${httpPort}`
  );
}
bootstrap();
