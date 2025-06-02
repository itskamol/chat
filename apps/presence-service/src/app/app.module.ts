import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
// import { ConfigModule } from '@nestjs/config';
// import { ClientsModule, Transport } from '@nestjs/microservices'; // For RabbitMQ client (publisher)
// import { RedisModule } from '@liaoliaots/nestjs-redis'; // Example Redis module

@Module({
  imports: [
    // ConfigModule.forRoot({ isGlobal: true }),
    // RedisModule.forRoot({ config: { host: 'localhost', port: 6379, /* ... */ } }), // FR-PS-006
    // ClientsModule.register([ // For publishing presence updates (FR-PS-005)
    //   {
    //     name: 'RABBITMQ_PRESENCE_PUBLISHER',
    //     transport: Transport.RMQ,
    //     options: { /* RabbitMQ options */ },
    //   },
    // ]),
  ],
  controllers: [AppController], // For health check
  providers: [AppService],      // AppService will contain gRPC and event handlers
})
export class AppModule {
  // This module will be configured to:
  // 1. Listen for events (e.g., user connect/disconnect from Gateway via RabbitMQ or gRPC).
  // 2. Provide gRPC service methods (FR-PS-004).
}
