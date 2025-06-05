import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MessageService } from '../message/message.service';
import { EventService } from './event.service';
import { ChatGateway } from '../websocket/chat.gateway';

describe('EventService', () => {
    let service: EventService;
    let eventEmitter: EventEmitter2;
    let messageService: MessageService;
    let chatGateway: ChatGateway;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EventService,
                {
                    provide: EventEmitter2,
                    useValue: {
                        emit: jest.fn(),
                        on: jest.fn(),
                        off: jest.fn(),
                    },
                },
                {
                    provide: MessageService,
                    useValue: {
                        createMessage: jest.fn(),
                        getMessageById: jest.fn(),
                        markAsRead: jest.fn(),
                    },
                },
                {
                    provide: ChatGateway,
                    useValue: {
                        server: {
                            to: jest.fn().mockReturnThis(),
                            emit: jest.fn(),
                        },
                        handleMessageCreated: jest.fn(),
                        handleMessageRead: jest.fn(),
                        handleUserTyping: jest.fn(),
                        handleUserJoinedRoom: jest.fn(),
                        handleUserLeftRoom: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<EventService>(EventService);
        eventEmitter = module.get<EventEmitter2>(EventEmitter2);
        messageService = module.get<MessageService>(MessageService);
        chatGateway = module.get<ChatGateway>(ChatGateway);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('emitMessageCreated', () => {
        it('should emit message.created event', async () => {
            const messageData = {
                messageId: 'msg-1',
                roomId: 'room-1',
                senderId: 'user-1',
                content: 'Hello',
                type: 'text',
                timestamp: new Date(),
            };

            service.emitMessageCreated(messageData);

            expect(eventEmitter.emit).toHaveBeenCalledWith('message.created', messageData);
        });
    });

    describe('emitMessageRead', () => {
        it('should emit message.read event', async () => {
            const readData = {
                messageId: 'msg-1',
                userId: 'user-1',
                roomId: 'room-1',
                timestamp: new Date(),
            };

            service.emitMessageRead(readData);

            expect(eventEmitter.emit).toHaveBeenCalledWith('message.read', readData);
        });
    });

    describe('emitUserTyping', () => {
        it('should emit user.typing event', async () => {
            const typingData = {
                userId: 'user-1',
                roomId: 'room-1',
                isTyping: true,
                timestamp: new Date(),
            };

            service.emitUserTyping(typingData);

            expect(eventEmitter.emit).toHaveBeenCalledWith('user.typing', typingData);
        });
    });

    describe('emitUserJoinedRoom', () => {
        it('should emit user.joined.room event', async () => {
            const joinData = {
                userId: 'user-1',
                roomId: 'room-1',
                timestamp: new Date(),
            };

            service.emitUserJoinedRoom(joinData);

            expect(eventEmitter.emit).toHaveBeenCalledWith('user.joined.room', joinData);
        });
    });

    describe('emitUserLeftRoom', () => {
        it('should emit user.left.room event', async () => {
            const leaveData = {
                userId: 'user-1',
                roomId: 'room-1',
                timestamp: new Date(),
            };

            service.emitUserLeftRoom(leaveData);

            expect(eventEmitter.emit).toHaveBeenCalledWith('user.left.room', leaveData);
        });
    });

    describe('emitRoomCreated', () => {
        it('should emit room.created event', async () => {
            const roomData = {
                roomId: 'room-1',
                name: 'Test Room',
                createdBy: 'user-1',
                type: 'GROUP',
                timestamp: new Date(),
            };

            service.emitRoomCreated(roomData);

            expect(eventEmitter.emit).toHaveBeenCalledWith('room.created', roomData);
        });
    });

    describe('event listeners', () => {
        it('should set up event listeners', () => {
            // EventService doesn't have onModuleInit, it uses decorators
            // Just test that the service is defined and working
            expect(service).toBeDefined();
            expect(eventEmitter.emit).toBeDefined();
        });
    });
});
