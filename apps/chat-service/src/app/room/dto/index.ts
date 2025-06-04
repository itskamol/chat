import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RoomType, RoomMemberRole } from '@chat/shared/domain';

export class CreateRoomDto {
  @ApiProperty({ description: 'Room name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Room description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Room type', enum: RoomType })
  @IsEnum(RoomType)
  type: RoomType;

  @ApiProperty({ description: 'Is room private', required: false })
  @IsBoolean()
  @IsOptional()
  isPrivate?: boolean;

  @ApiProperty({ description: 'Room creator ID' })
  @IsString()
  createdBy: string;

  @ApiProperty({ description: 'Room avatar URL', required: false })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiProperty({ description: 'Room settings', required: false })
  @IsOptional()
  settings?: Record<string, any>;
}

export class UpdateRoomDto {
  @ApiProperty({ description: 'Room name', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'Room description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Is room private', required: false })
  @IsBoolean()
  @IsOptional()
  isPrivate?: boolean;

  @ApiProperty({ description: 'Room avatar URL', required: false })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiProperty({ description: 'Room settings', required: false })
  @IsOptional()
  settings?: Record<string, any>;
}

export class AddMemberDto {
  @ApiProperty({ description: 'User ID to add to room' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Member role', enum: RoomMemberRole, required: false })
  @IsEnum(RoomMemberRole)
  @IsOptional()
  role?: RoomMemberRole = RoomMemberRole.MEMBER;
}

export class UpdateMemberRoleDto {
  @ApiProperty({ description: 'New member role', enum: RoomMemberRole })
  @IsEnum(RoomMemberRole)
  role: RoomMemberRole;
}
