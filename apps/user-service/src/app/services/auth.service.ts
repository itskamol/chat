import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { IUserRepository } from '@chat/shared/domain';
import { CreateUserDto, LoginDto, UpdateUserDto } from '../dto/user.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async register(createUserDto: CreateUserDto) {
    // Check if user already exists by email
    const existingUserByEmail = await this.userRepository.findByEmail(
      createUserDto.email,
    );
    if (existingUserByEmail) {
      throw new ConflictException('User with this email already exists');
    }

    // Check if username is taken
    const existingUserByUsername = await this.userRepository.findByUsername(
      createUserDto.username,
    );
    if (existingUserByUsername) {
      throw new ConflictException('Username is already taken');
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      saltRounds,
    );

    // Create user
    const user = await this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    // Generate token
    const token = await this.generateToken(user);

    return {
      user: this.sanitizeUser(user),
      token,
    };
  }

  async login(loginDto: LoginDto) {
    // Find user by email or username
    let user = await this.userRepository.findByEmail(loginDto.emailOrUsername);
    if (!user) {
      user = await this.userRepository.findByUsername(loginDto.emailOrUsername);
    }

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update online status
    await this.userRepository.updateOnlineStatus(user._id, true);

    // Generate token
    const token = await this.generateToken(user);

    return {
      user: this.sanitizeUser(user),
      token,
    };
  }

  async logout(userId: string) {
    await this.userRepository.updateOnlineStatus(userId, false);
    return { message: 'Logged out successfully' };
  }

  async refreshToken(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const token = await this.generateToken(user);
    return { token };
  }

  async updateProfile(userId: string, updateUserDto: UpdateUserDto) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.userRepository.update(userId, updateUserDto);
    return this.sanitizeUser(updatedUser);
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.sanitizeUser(user);
  }

  async validateUser(payload: any) {
    const user = await this.userRepository.findById(payload.id);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return this.sanitizeUser(user);
  }

  private async generateToken(user: any): Promise<string> {
    const payload = {
      id: user._id,
      username: user.username,
      email: user.email,
      roles: user.roles,
    };
    return this.jwtService.signAsync(payload);
  }

  private sanitizeUser(user: any) {
    const { password, ...sanitizedUser } = user.toObject
      ? user.toObject()
      : user;
    return sanitizedUser;
  }
}
