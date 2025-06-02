import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { Logger } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices'; // Import for gRPC

async function bootstrap() {
  // This service will primarily be a gRPC microservice.
  // It might not need to listen on HTTP unless for health checks or specific admin APIs.

  // Create a hybrid application if both HTTP and gRPC are needed.
  const app = await NestFactory.create(AppModule);

  // Setup for gRPC server part
  const grpcPort = process.env.GRPC_PORT || 50053; // Ensure unique port
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'message', // Package name from your .proto file
      protoPath: 'path/to/your/message.proto', // Path to the .proto definition
      url: `0.0.0.0:${grpcPort}`, // URL for the gRPC server to listen on
      // loader: { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true } // Optional loader options
    },
  });

  await app.startAllMicroservices();
  Logger.log(`🚀 Message service gRPC listening on port ${grpcPort}`);

  // Optional: Start HTTP server if AppController has HTTP routes (e.g., health check)
  const httpPort = process.env.HTTP_PORT || 3003; // Ensure unique port
  await app.listen(httpPort);
  Logger.log(
    `🚀 Message service HTTP (if any routes exist) listening on: http://localhost:${httpPort}`
  );
}
bootstrap();
