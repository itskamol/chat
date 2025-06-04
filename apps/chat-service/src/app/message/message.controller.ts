import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards,
  Request
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MessageService } from './message.service';
import { CreateMessageDto, UpdateMessageDto, MarkAsReadDto } from './dto';

@ApiTags('messages')
@Controller('messages')
@ApiBearerAuth()
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post()
  @ApiOperation({ summary: 'Send a new message' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  async sendMessage(@Body() createMessageDto: CreateMessageDto) {
    return this.messageService.createMessage(createMessageDto);
  }

  @Get('room/:roomId')
  @ApiOperation({ summary: 'Get messages for a room' })
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully' })
  async getMessagesByRoom(
    @Param('roomId') roomId: string,
    @Query('limit') limit?: number,
    @Query('skip') skip?: number
  ) {
    return this.messageService.getMessagesByRoom(roomId, { limit, skip });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a message' })
  @ApiResponse({ status: 200, description: 'Message updated successfully' })
  async updateMessage(
    @Param('id') id: string,
    @Body() updateMessageDto: UpdateMessageDto
  ) {
    return this.messageService.updateMessage(id, updateMessageDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a message' })
  @ApiResponse({ status: 200, description: 'Message deleted successfully' })
  async deleteMessage(@Param('id') id: string) {
    return this.messageService.deleteMessage(id);
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark message as read' })
  @ApiResponse({ status: 200, description: 'Message marked as read' })
  async markAsRead(
    @Param('id') id: string,
    @Body() markAsReadDto: MarkAsReadDto
  ) {
    return this.messageService.markAsRead(id, markAsReadDto.userId);
  }
}
