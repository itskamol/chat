import { Injectable, Inject } from '@nestjs/common';
import { IRoomRepository, IUserRepository, RoomType, RoomMemberRole } from '@chat/shared/domain';
import { CreateRoomDto, UpdateRoomDto, AddMemberDto } from './dto';
import { EventService } from '../events/event.service';

@Injectable()
export class RoomService {
  constructor(
    @Inject('IRoomRepository') private roomRepository: IRoomRepository,
    @Inject('IUserRepository') private userRepository: IUserRepository,
    private readonly eventService: EventService,
  ) { }

  async createRoom(createRoomDto: CreateRoomDto) {
    try {
      // Add creator as admin member
      const roomData = {
        ...createRoomDto,
        members: [{
          userId: createRoomDto.createdBy,
          role: RoomMemberRole.ADMIN,
          joinedAt: new Date(),
          lastSeen: new Date(),
        }],
      };

      const room = await this.roomRepository.create(roomData);

      // Emit room created event
      this.eventService.emitRoomCreated({
        roomId: room.id,
        name: room.name,
        createdBy: room.createdBy,
        type: room.type,
        timestamp: room.createdAt || new Date(),
      });

      return {
        success: true,
        data: room,
        message: 'Room created successfully',
      };
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        error: err.message,
      };
    }
  }

  async getRoomById(id: string) {
    try {
      const room = await this.roomRepository.findById(id);
      if (!room) {
        return {
          success: false,
          error: 'Room not found',
        };
      }

      return {
        success: true,
        data: room,
      };
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        error: err.message,
      };
    }
  }

  async getUserRooms(userId: string) {
    try {
      const rooms = await this.roomRepository.findByUserId(userId);
      return {
        success: true,
        data: rooms,
      };
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        error: err.message,
      };
    }
  }

  async updateRoom(id: string, updateRoomDto: UpdateRoomDto) {
    try {
      const room = await this.roomRepository.update(id, updateRoomDto);
      return {
        success: true,
        data: room,
        message: 'Room updated successfully',
      };
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        error: err.message,
      };
    }
  }

  async deleteRoom(id: string) {
    try {
      const result = await this.roomRepository.delete(id);
      return {
        success: result,
        message: result ? 'Room deleted successfully' : 'Failed to delete room',
      };
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        error: err.message,
      };
    }
  }

  async addMember(roomId: string, addMemberDto: AddMemberDto) {
    try {
      // Check if user exists
      const user = await this.userRepository.findById(addMemberDto.userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      // Check if user is already a member
      const isMember = await this.roomRepository.isUserMember(roomId, addMemberDto.userId);
      if (isMember) {
        return {
          success: false,
          error: 'User is already a member of this room',
        };
      }

      await this.roomRepository.addMember(roomId, addMemberDto.userId, addMemberDto.role);

      return {
        success: true,
        message: 'Member added successfully',
      };
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        error: err.message,
      };
    }
  }

  async removeMember(roomId: string, userId: string) {
    try {
      await this.roomRepository.removeMember(roomId, userId);

      return {
        success: true,
        message: 'Member removed successfully',
      };
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        error: err.message,
      };
    }
  }

  async updateMemberRole(roomId: string, userId: string, role: RoomMemberRole) {
    try {
      await this.roomRepository.updateMemberRole(roomId, userId, role);

      return {
        success: true,
        message: 'Member role updated successfully',
      };
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        error: err.message,
      };
    }
  }
}
