import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
// import { ConfigModule } from '@nestjs/config';
// import { TypeOrmModule } from '@nestjs/typeorm'; // For DB (file metadata)
// import { FileMetadataEntity } from './entities/file-metadata.entity';
// import { ClientsModule, Transport } from '@nestjs/microservices'; // For RabbitMQ client (publisher)
// Import AWS SDK S3 client or similar for blob storage if not using a dedicated NestJS module

@Module({
  imports: [
    // ConfigModule.forRoot({ isGlobal: true }),
    // TypeOrmModule.forRoot({ /* DB config for metadata */ }),
    // TypeOrmModule.forFeature([/* FileMetadataEntity */]),
    // ClientsModule.register([ // For publishing FileUploaded event (FR-FS-005)
    //   {
    //     name: 'RABBITMQ_FILE_EVENT_PUBLISHER',
    //     transport: Transport.RMQ,
    //     options: { /* RabbitMQ options */ },
    //   },
    // ]),
    // Add module for S3/MinIO client if available, or provide S3 client directly
  ],
  controllers: [AppController], // For health check
  providers: [AppService],      // AppService will contain gRPC method handlers
})
export class AppModule {
  // This module will be configured to act as a gRPC server.
  // The gRPC methods for file operations will be defined in AppService
  // and marked with @GrpcMethod decorators.
  // A .proto file defining the service and messages will be essential.
}
