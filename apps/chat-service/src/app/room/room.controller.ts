import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  UseGuards 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RoomService } from './room.service';
import { CreateRoomDto, UpdateRoomDto, AddMemberDto, UpdateMemberRoleDto } from './dto';
import { RoomMemberRole } from '@chat/shared/domain';

@ApiTags('rooms')
@Controller('rooms')
@ApiBearerAuth()
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new room' })
  @ApiResponse({ status: 201, description: 'Room created successfully' })
  async createRoom(@Body() createRoomDto: CreateRoomDto) {
    return this.roomService.createRoom(createRoomDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get room by ID' })
  @ApiResponse({ status: 200, description: 'Room retrieved successfully' })
  async getRoomById(@Param('id') id: string) {
    return this.roomService.getRoomById(id);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get rooms for a user' })
  @ApiResponse({ status: 200, description: 'User rooms retrieved successfully' })
  async getUserRooms(@Param('userId') userId: string) {
    return this.roomService.getUserRooms(userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a room' })
  @ApiResponse({ status: 200, description: 'Room updated successfully' })
  async updateRoom(
    @Param('id') id: string,
    @Body() updateRoomDto: UpdateRoomDto
  ) {
    return this.roomService.updateRoom(id, updateRoomDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a room' })
  @ApiResponse({ status: 200, description: 'Room deleted successfully' })
  async deleteRoom(@Param('id') id: string) {
    return this.roomService.deleteRoom(id);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add member to room' })
  @ApiResponse({ status: 201, description: 'Member added successfully' })
  async addMember(
    @Param('id') roomId: string,
    @Body() addMemberDto: AddMemberDto
  ) {
    return this.roomService.addMember(roomId, addMemberDto);
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'Remove member from room' })
  @ApiResponse({ status: 200, description: 'Member removed successfully' })
  async removeMember(
    @Param('id') roomId: string,
    @Param('userId') userId: string
  ) {
    return this.roomService.removeMember(roomId, userId);
  }

  @Put(':id/members/:userId/role')
  @ApiOperation({ summary: 'Update member role in room' })
  @ApiResponse({ status: 200, description: 'Member role updated successfully' })
  async updateMemberRole(
    @Param('id') roomId: string,
    @Param('userId') userId: string,
    @Body() updateMemberRoleDto: UpdateMemberRoleDto
  ) {
    return this.roomService.updateMemberRole(roomId, userId, updateMemberRoleDto.role);
  }
}
