import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
// import { ConfigModule } from '@nestjs/config';
// import { TypeOrmModule } from '@nestjs/typeorm'; // For DB interaction (e.g., PostgreSQL)
// import { UserEntity } from './entities/user.entity'; // Example User entity
// import { ClientsModule, Transport } from '@nestjs/microservices'; // For RabbitMQ client
// import { PassportModule } from '@nestjs/passport'; // For authentication strategies
// import { JwtModule } from '@nestjs/jwt'; // For JWT generation/validation

@Module({
  imports: [
    // ConfigModule.forRoot({ isGlobal: true }),
    // PassportModule, // For Auth
    // JwtModule.register({ /* secret, signOptions */ }), // For Auth
    // TypeOrmModule.forRoot({ /* DB connection options */ }),
    // TypeOrmModule.forFeature([UserEntity]), // Registering User entity
    // ClientsModule.register([ // For RabbitMQ (FR-US-004)
    //   {
    //     name: 'RABBITMQ_SERVICE', // Injection token
    //     transport: Transport.RMQ,
    //     options: {
    //       urls: ['amqp://localhost:5672'], // RabbitMQ URL from config
    //       queue: 'user_events_queue', // Optional: default queue
    //       queueOptions: {
    //         durable: true
    //       },
    //     },
    //   },
    // ]),
  ],
  controllers: [AppController], // HTTP controllers
  providers: [AppService],
  // exports: [AppService] // If exposing service for gRPC, this might be handled differently
})
export class AppModule {
  // FR-US-005: Provide gRPC endpoints.
  // To expose gRPC services, this module would be configured as a microservice.
  // The main.ts would then use app.listen() for HTTP and app.startAllMicroservices() or
  // app.connectMicroservice() for gRPC.
  // A separate gRPC controller (e.g., user.grpc.controller.ts) or methods within
  // AppService marked with @GrpcMethod would handle gRPC requests.
}
