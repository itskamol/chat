import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
// import { ConfigModule } from '@nestjs/config';
// import { MongooseModule } from '@nestjs/mongoose'; // For MongoDB with Mongoose
// import { MessageSchema, Message } from './schemas/message.schema'; // Example schema

@Module({
  imports: [
    // ConfigModule.forRoot({ isGlobal: true }),
    // MongooseModule.forRoot('mongodb://localhost/nest-chat-message-db'), // Example DB connection
    // MongooseModule.forFeature([{ name: Message.name, schema: MessageSchema }]),
  ],
  controllers: [AppController], // May be removed if purely gRPC with no HTTP endpoints
  providers: [AppService],      // AppService will contain gRPC method handlers
})
export class AppModule {
  // This module will be configured to act as a gRPC server.
  // The gRPC methods will be defined in AppService (or a dedicated gRPC controller)
  // and marked with @GrpcMethod decorators.
  // The .proto file defining the service and messages will be crucial.
}
