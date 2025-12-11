import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from 'src/types/user.type';
import { hashString, verifyString } from 'src/common/utils/hash.util';
import { FileLoggerService } from 'src/common/logger/file-logger.service';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthService {
  private logger = new FileLoggerService(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (!user.verified) throw new BadRequestException('User not verified');

    const verify = await verifyString(dto.password, user.password);
    if (!verify) throw new UnauthorizedException('Invalid credentials');

    return this.generateTokens(user.id, user.email);
  }

  async register(dto: CreateUserDto) {
    try {
      const existingUser = await this.usersService.findByEmail(dto.email);
      if (existingUser)
        throw new BadRequestException('Email already registered');

      const userExists = await this.usersService.findByEmail(dto.email);
      if (userExists) throw new BadRequestException('Email already exists');

      const user = await this.usersService.create(dto);

      return user;
    } catch (error) {
      this.logger.error('Error during registration', String(error));
      throw error;
    }
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(
        refreshToken,
        {
          secret: process.env.JWT_REFRESH_SECRET,
        },
      );

      const user = await this.usersService.findByEmail(payload.email);
      if (!user || !user.refreshToken)
        throw new UnauthorizedException('Invalid refresh token');

      const isMatch = await verifyString(refreshToken, user.refreshToken);
      if (!isMatch) throw new UnauthorizedException('Invalid refresh token');

      return this.generateTokens(user.id, user.email);
    } catch (err) {
      this.logger.error('Error refreshing token', String(err));
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: number) {
    try {
      await this.usersService.update(userId, { refreshToken: null });
      return null;
    } catch (err) {
      this.logger.error('Error during logout', String(err));
      throw new UnauthorizedException('Logout failed');
    }
  }

  async profile(userId: number) {
    const user = await this.usersService.findOne(userId);
    if (!user) throw new UnauthorizedException('User not found');
    return user;
  }

  private async generateTokens(userId: number, email: string) {
    const expires_in = Number(process.env.JWT_EXPIRES) || 3600;
    const expires_refresh_in =
      Number(process.env.JWT_REFRESH_EXPIRES) || 604800;

    const payload = {
      sub: userId,
      email: email,
      jti: randomUUID(),
      iat: Math.floor(Date.now() / 1000),
    };

    const access_token = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: expires_in,
    });

    const refresh_payload = { ...payload, jti: randomUUID() };

    const refresh_token = await this.jwtService.signAsync(refresh_payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: expires_refresh_in,
    });

    const hashedRefresh = await hashString(refresh_token);

    await this.usersService.update(userId, {
      refreshToken: hashedRefresh,
    });

    return {
      access_token,
      refresh_token,
      expires_in,
    };
  }
}
