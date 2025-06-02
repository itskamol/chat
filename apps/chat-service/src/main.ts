import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { Logger } from '@nestjs/common';
// import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // HTTP server for chat room management APIs (if any)
  const httpPort = process.env.HTTP_PORT || 3002; // Different from gateway/user-service
  await app.listen(httpPort);
  Logger.log(
    `🚀 Chat service HTTP listening on: http://localhost:${httpPort}`
  );

  // Example gRPC server setup (FR-CS-005)
  // const grpcPort = process.env.GRPC_PORT || 50052;
  // app.connectMicroservice<MicroserviceOptions>({
  //   transport: Transport.GRPC,
  //   options: {
  //     package: 'chat', // from chat.proto
  //     protoPath: 'path/to/chat.proto',
  //     url: `0.0.0.0:${grpcPort}`,
  //   },
  // });
  // await app.startAllMicroservices();
  // Logger.log(`🚀 Chat service gRPC listening on port ${grpcPort}`);
}
bootstrap();
