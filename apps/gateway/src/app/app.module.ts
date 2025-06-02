import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
// import { ConfigModule } from '@nestjs/config'; // FR-GW-0xx: Configuration
// import { ClientsModule, Transport } from '@nestjs/microservices'; // For gRPC clients
// import { JwtModule } from '@nestjs/jwt'; // FR-GW-004: Authentication
// import { PassportModule } from '@nestjs/passport'; // FR-GW-004: Authentication
// import { ThrottlerModule } from '@nestjs/throttler'; // FR-GW-006: Rate Limiting

@Module({
  imports: [
    // ConfigModule.forRoot({ isGlobal: true }), // Example: Centralized Configuration
    // PassportModule, // FR-GW-004
    // JwtModule.register({ secret: 'yourSecretKey' }), // FR-GW-004 (secret should come from config)
    // ThrottlerModule.forRoot([{ ttl: 60, limit: 10 }]), // FR-GW-006: Example rate limiting
    // ClientsModule.register([ // Example gRPC client registration
    //   {
    //     name: 'USER_SERVICE',
    //     transport: Transport.GRPC,
    //     options: {
    //       package: 'user', // package name defined in .proto
    //       protoPath: 'path/to/user.proto', // path to .proto file
    //       url: 'localhost:50051', // user-service address
    //     },
    //   },
    // ]),
    // Add other modules for different services (chat, message, etc.)
  ],
  controllers: [AppController],
  providers: [AppService],
  // Exports: [AppService] // If other modules in gateway need it
})
export class AppModule {
  // FR-GW-005: Centralized authorization (RBAC) - often implemented with Guards
  // FR-GW-010: Standard CORS handling - app.enableCors() in main.ts
}
