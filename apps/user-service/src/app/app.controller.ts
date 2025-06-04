import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  UseGuards,
  HttpStatus,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './services/auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import {
  CreateUserDto,
  LoginDto,
  UpdateUserDto,
  UserResponseDto,
} from './dto/user.dto';

@ApiTags('auth')
@Controller('auth')
@UsePipes(new ValidationPipe({ transform: true }))
export class AppController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User registered successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'User already exists',
  })
  async register(@Body() createUserDto: CreateUserDto) {
    const result = await this.authService.register(createUserDto);
    return {
      status: HttpStatus.CREATED,
      message: 'User registered successfully',
      data: {
        user: new UserResponseDto(result.user),
        token: result.token,
      },
    };
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User logged in successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials',
  })
  async login(@Body() loginDto: LoginDto) {
    const result = await this.authService.login(loginDto);
    return {
      status: HttpStatus.OK,
      message: 'Login successful',
      data: {
        user: new UserResponseDto(result.user),
        token: result.token,
      },
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User logged out successfully',
  })
  async logout(@CurrentUser() user: any) {
    const result = await this.authService.logout(user.id);
    return {
      status: HttpStatus.OK,
      data: result,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User profile retrieved successfully',
    type: UserResponseDto,
  })
  async getProfile(@CurrentUser() user: any) {
    const profile = await this.authService.getProfile(user.id);
    return {
      status: HttpStatus.OK,
      message: 'Profile retrieved successfully',
      data: new UserResponseDto(profile),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profile updated successfully',
    type: UserResponseDto,
  })
  async updateProfile(
    @CurrentUser() user: any,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const updatedProfile = await this.authService.updateProfile(
      user.id,
      updateUserDto,
    );
    return {
      status: HttpStatus.OK,
      message: 'Profile updated successfully',
      data: new UserResponseDto(updatedProfile),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Token refreshed successfully',
  })
  async refreshToken(@CurrentUser() user: any) {
    const result = await this.authService.refreshToken(user.id);
    return {
      status: HttpStatus.OK,
      message: 'Token refreshed successfully',
      data: result,
    };
  }
}
