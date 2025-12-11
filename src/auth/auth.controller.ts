import { Body, Controller, Get, HttpCode, Post, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SkipAuth } from 'src/common/decorators/skip-auth/skip-auth.decorator';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @SkipAuth()
  @Post('register')
  register(@Body() dto: CreateUserDto) {
    return this.auth.register(dto);
  }

  @SkipAuth()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @SkipAuth()
  @Post('refresh')
  async refresh(@Body() body: RefreshTokenDto) {
    return this.auth.refreshToken(body.refresh_token);
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Request() req: Express.Request) {
    const userId = req.user?.sub as number;
    return this.auth.logout(userId);
  }

  @Get('profile')
  getProfile(@Request() req: Express.Request) {
    return this.auth.profile(req.user?.sub as number);
  }
}
