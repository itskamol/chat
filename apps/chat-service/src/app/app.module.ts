import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
// import { ConfigModule } from '@nestjs/config';
// import { TypeOrmModule } from '@nestjs/typeorm'; // For DB (e.g., chat room metadata)
// import { ChatRoomEntity } from './entities/chatroom.entity';
// import { ClientsModule, Transport } from '@nestjs/microservices'; // For RabbitMQ & gRPC client (message-service)
// import { ChatGateway } from './gateways/chat.gateway'; // FR-CS-002: WebSocket Gateway

@Module({
  imports: [
    // ConfigModule.forRoot({ isGlobal: true }),
    // TypeOrmModule.forRoot({ /* DB config */ }),
    // TypeOrmModule.forFeature([/* ChatRoomEntity, etc. */]),
    // ClientsModule.register([
    //   { // RabbitMQ for publishing events (FR-CS-006)
    //     name: 'RABBITMQ_CHAT_SERVICE_PUBLISHER',
    //     transport: Transport.RMQ,
    //     options: { /* RabbitMQ options */ },
    //   },
    //   { // gRPC Client for message-service (FR-CS-003)
    //     name: 'MESSAGE_SERVICE_GRPC',
    //     transport: Transport.GRPC,
    //     options: {
    //       package: 'message', // from message.proto
    //       protoPath: 'path/to/message.proto',
    //       url: 'localhost:5005X', // message-service gRPC address
    //     },
    //   },
    // ]),
  ],
  controllers: [AppController], // HTTP controllers
  providers: [
    AppService,
    // ChatGateway, // FR-CS-002: WebSocket Gateway for real-time events
  ],
})
export class AppModule {
  // FR-CS-005: Provide gRPC endpoints (setup similar to user-service for gRPC server)
}
