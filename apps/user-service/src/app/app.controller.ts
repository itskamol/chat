import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { AppService } from './app.service';

// DTOs removed for diagnostics - will use Record<string, unknown> or any

@Controller() // Base path can be set here e.g. @Controller('users') or rely on method paths
export class AppController {
  constructor(private readonly appService: AppService) {}

  // FR-US-001: Manage user lifecycle
  // FR-US-001.1: POST /auth/register - User registration
  @Post('auth/register')
  register(@Body() userRegistrationDto: Record<string, unknown>) {
    // FR-US-002: Securely store user credentials
    // FR-US-004: Publish UserCreated event to RabbitMQ
    return this.appService.register(userRegistrationDto);
  }

  // FR-US-001.2: POST /auth/login - User login, returns JWT
  @Post('auth/login')
  login(@Body() userLoginDto: Record<string, unknown>) {
    return this.appService.login(userLoginDto);
  }

  // FR-US-001.3: POST /auth/refresh - Refresh JWT
  @Post('auth/refresh')
  refreshAccessToken(@Body() body: { refreshToken: string }) {
    // This would typically involve validating the refresh token
    return this.appService.refreshAccessToken(body.refreshToken);
  }

  // FR-US-001.4: GET /users/me - Get current user profile
  // (Requires authentication - to be added via Guards)
  @Get('users/me')
  getCurrentUserProfile(/* @Req() req */) {
    // const userId = req.user.id; // Assuming user context from auth guard
    // return this.appService.getUserProfile(userId);
    return this.appService.getCurrentUserProfilePlaceholder();
  }

  // FR-US-001.5: PATCH /users/me - Update current user profile
  // (Requires authentication)
  @Patch('users/me')
  updateCurrentUserProfile(@Body() userProfileUpdateDto: Record<string, unknown> /* @Req() req */) {
    // const userId = req.user.id;
    // FR-US-004: Publish UserProfileUpdated event
    // return this.appService.updateUserProfile(userId, userProfileUpdateDto);
    return this.appService.patchCurrentUserProfilePlaceholder(userProfileUpdateDto); // Calling renamed method
  }

  // FR-US-001.6: GET /users/{id} - Get user profile by ID
  // (Requires authentication/authorization)
  @Get('users/:id')
  getUserProfileById(@Param('id') id: string) {
    return this.appService.getUserProfileById(id);
  }

  // FR-US-001.7: GET /users/search?query= - Search users
  // (Requires authentication/authorization)
  @Get('users/search')
  searchUsers(@Query('query') query: string) {
    return this.appService.searchUsers(query);
  }

  // FR-US-006: Handle password reset functionality
  @Post('auth/request-password-reset')
  requestPasswordReset(@Body() body: { email: string }) {
    return this.appService.requestPasswordReset(body.email);
  }

  @Post('auth/reset-password')
  resetPassword(@Body() body: { token: string; newPassword: string }) {
    return this.appService.resetPassword(body.token, body.newPassword);
  }

  // FR-US-005: Provide gRPC endpoints for internal services
  // This will be handled by a separate gRPC controller or by defining gRPC methods
  // directly in the service and exposing them via the main NestJS microservice listener.
  // Example (conceptual, actual gRPC methods in service, exposed via module):
  // @GrpcMethod('UserService', 'GetUserById')
  // grpcGetUserById(data: { id: string }): User { ... }
}
