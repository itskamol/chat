import { IsEmail, IsString, MinLength, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ description: 'User email', example: 'user@example.com' })
  @IsEmail({}, { message: 'Please provide a valid email' })
  email: string;

  @ApiProperty({ description: 'Username', example: 'john_doe' })
  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  @MaxLength(30, { message: 'Username must not exceed 30 characters' })
  username: string;

  @ApiProperty({ description: 'User password', example: 'StrongPassword123!' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @ApiProperty({ description: 'Display name', example: 'John Doe' })
  @IsString()
  @MaxLength(50, { message: 'Display name must not exceed 50 characters' })
  displayName: string;

  @ApiProperty({ description: 'User avatar URL', required: false })
  @IsOptional()
  @IsString()
  avatar?: string;
}

export class LoginDto {
  @ApiProperty({ description: 'Email or username', example: 'user@example.com' })
  @IsString()
  emailOrUsername: string;

  @ApiProperty({ description: 'User password', example: 'StrongPassword123!' })
  @IsString()
  password: string;
}

export class UpdateUserDto {
  @ApiProperty({ description: 'Display name', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  displayName?: string;

  @ApiProperty({ description: 'User avatar URL', required: false })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiProperty({ description: 'User preferences', required: false })
  @IsOptional()
  preferences?: Record<string, any>;
}

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  displayName: string;

  @ApiProperty()
  avatar?: string;

  @ApiProperty()
  isOnline: boolean;

  @ApiProperty()
  lastSeen?: Date;

  @ApiProperty()
  roles: string[];

  @ApiProperty()
  status: string;

  @ApiProperty()
  createdAt: Date;

  constructor(user: any) {
    this.id = user._id || user.id;
    this.username = user.username;
    this.email = user.email;
    this.displayName = user.displayName;
    this.avatar = user.avatar;
    this.isOnline = user.isOnline;
    this.lastSeen = user.lastSeen;
    this.roles = user.roles;
    this.status = user.status;
    this.createdAt = user.createdAt;
  }
}
