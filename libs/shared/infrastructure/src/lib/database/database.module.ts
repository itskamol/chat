import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { 
  User, 
  UserSchema, 
  Message, 
  MessageSchema, 
  Room, 
  RoomSchema, 
  FileEntity, 
  FileSchema 
} from '@chat/shared/domain';
import { UserRepository } from '../repositories/user.repository';
import { MessageRepository } from '../repositories/message.repository';
import { RoomRepository } from '../repositories/room.repository';
import { FileRepository } from '../repositories/file.repository';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        '.env.local',
        '.env.docker', 
        '.env.production',
        '.env'
      ],
    }),
    MongooseModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI') || 'mongodb://localhost:27017/chat',
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Message.name, schema: MessageSchema },
      { name: Room.name, schema: RoomSchema },
      { name: FileEntity.name, schema: FileSchema },
    ]),
  ],
  providers: [
    UserRepository,
    MessageRepository,
    RoomRepository,
    FileRepository,
    {
      provide: 'IUserRepository',
      useClass: UserRepository,
    },
    {
      provide: 'IMessageRepository',
      useClass: MessageRepository,
    },
    {
      provide: 'IRoomRepository',
      useClass: RoomRepository,
    },
    {
      provide: 'IFileRepository',
      useClass: FileRepository,
    },
  ],
  exports: [
    MongooseModule,
    UserRepository,
    MessageRepository,
    RoomRepository,
    FileRepository,
    'IUserRepository',
    'IMessageRepository',
    'IRoomRepository',
    'IFileRepository',
  ],
})
export class DatabaseModule {}
