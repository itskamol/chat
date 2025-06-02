import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { Logger } from '@nestjs/common';
// import { MicroserviceOptions, Transport } from '@nestjs/microservices'; // For gRPC

async function bootstrap() {
  // HTTP server (for REST API, if user-service exposes any directly)
  const app = await NestFactory.create(AppModule);

  // Example: Setting up gRPC server (FR-US-005)
  // This assumes AppModule is prepared to provide gRPC handlers.
  // const grpcPort = process.env.GRPC_PORT || 50051;
  // app.connectMicroservice<MicroserviceOptions>({
  //   transport: Transport.GRPC,
  //   options: {
  //     package: 'user', // Package name from .proto file
  //     protoPath: 'path/to/user.proto', // Path to .proto definition
  //     url: `0.0.0.0:${grpcPort}`,
  //   },
  // });
  // await app.startAllMicroservices();
  // Logger.log(`🚀 User service gRPC listening on port ${grpcPort}`);


  const httpPort = process.env.HTTP_PORT || 3001; // Different from gateway
  await app.listen(httpPort);
  Logger.log(
    `🚀 User service HTTP listening on: http://localhost:${httpPort}`
  );
}
bootstrap();
