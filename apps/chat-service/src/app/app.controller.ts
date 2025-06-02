import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common'; // Removed Query
import { AppService } from './app.service';

// Placeholder DTOs - define properly in dto folder or shared lib
type CreateChatRoomDto = Record<string, unknown>;
type UpdateChatRoomDto = Record<string, unknown>;
// Updated AddRemoveParticipantDto to match service expectation
type AddRemoveParticipantDto = { userId: string; [key: string]: unknown };
type ChatRoomId = string;
type UserId = string;

@Controller('chat-rooms') // Base path for chat room related HTTP operations
export class AppController {
  constructor(private readonly appService: AppService) {}

  // FR-CS-001: Manage chat rooms/conversations (one-to-one, group).
  // FR-CS-001.1: Create chat rooms.
  @Post()
  createChatRoom(@Body() createChatRoomDto: CreateChatRoomDto) {
    // FR-CS-006: Publish ChatRoomCreated event to RabbitMQ
    return this.appService.createChatRoom(createChatRoomDto);
  }

  // FR-CS-001.1: Update chat rooms.
  @Patch(':roomId')
  updateChatRoom(@Param('roomId') roomId: ChatRoomId, @Body() updateChatRoomDto: UpdateChatRoomDto) {
    return this.appService.updateChatRoom(roomId, updateChatRoomDto);
  }

  // FR-CS-001.1: Delete chat rooms.
  @Delete(':roomId')
  deleteChatRoom(@Param('roomId') roomId: ChatRoomId) {
    return this.appService.deleteChatRoom(roomId);
  }

  // FR-CS-001.2: Add participants to chat rooms.
  @Post(':roomId/participants')
  addParticipantToChatRoom(@Param('roomId') roomId: ChatRoomId, @Body() addParticipantDto: AddRemoveParticipantDto) {
    // FR-CS-006: Publish UserJoinedChat event
    return this.appService.addParticipant(roomId, addParticipantDto);
  }

  // FR-CS-001.2: Remove participants from chat rooms.
  @Delete(':roomId/participants/:userId')
  removeParticipantFromChatRoom(@Param('roomId') roomId: ChatRoomId, @Param('userId') userId: UserId) {
    // FR-CS-006: Publish UserLeftChat event (example)
    return this.appService.removeParticipant(roomId, userId);
  }

  // FR-CS-004: Manage user permissions within chat rooms (e.g., admin, moderator).
  // (This might involve specific endpoints or be part of updateChatRoom/addParticipant logic)
  @Patch(':roomId/participants/:userId/permissions')
  updateParticipantPermissions(
    @Param('roomId') roomId: ChatRoomId,
    @Param('userId') userId: UserId,
    @Body() permissionsDto: Record<string, unknown>,
  ) {
    return this.appService.updateParticipantPermissions(roomId, userId, permissionsDto);
  }


  // FR-CS-002: Handle real-time message broadcasting via WebSocket events.
  // This will be primarily handled by a @WebSocketGateway() class.
  // - FR-CS-002.1: Emit NewMessage event to room participants.
  // - FR-CS-002.2: Emit MessageRead event.
  // - FR-CS-002.3: Emit UserTyping event.
  // The controller might have methods to trigger these if needed for non-WebSocket originated events.

  // FR-CS-005: Provide gRPC endpoints for fetching chat room details, participants, etc.
  // This will be handled by a separate gRPC controller or by defining gRPC methods
  // directly in the service and exposing them via the main NestJS microservice listener.
  // Example (conceptual):
  // @GrpcMethod('ChatService', 'GetChatRoomDetails')
  // grpcGetChatRoomDetails(data: { roomId: string }): ChatRoomDetails { ... }

  @Get('health')
  getHealth(): string {
    return 'Chat service is healthy!';
  }
}
