import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '../../common/enums/role.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { RegisterDto } from './dto/register.dto';
import { VerifyOtpDto } from './dto/auth.dto';

interface Tokens {
  accessToken: string;
  refreshToken: string;
}
export type { Tokens };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
  ) {}

  async register(dto: RegisterDto): Promise<Tokens> {
    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, 12)
      : null;

    const user = await this.prisma.user.create({
      data: {
        phone: dto.phone,
        passwordHash,
        role: dto.role ?? Role.CUSTOMER,
        customer:
          (dto.role ?? Role.CUSTOMER) === Role.CUSTOMER
            ? { create: { fullName: dto.fullName } }
            : undefined,
        technician:
          dto.role === Role.TECHNICIAN
            ? { create: { fullName: dto.fullName } }
            : undefined,
      },
    });

    return this.issueTokens(user.id, user.role, user.phone);
  }

  /** Sends an OTP via MSG91 (rate-limited upstream by ThrottlerGuard). */
  async requestOtp(phone: string): Promise<{ sent: boolean }> {
    // A real implementation stores a hashed OTP in Redis with a short TTL.
    await this.notifications.sendOtp(phone);
    return { sent: true };
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<Tokens> {
    const valid = await this.notifications.verifyOtp(dto.phone, dto.code);
    if (!valid) {
      throw new UnauthorizedException('Invalid OTP');
    }

    const user = await this.prisma.user.upsert({
      where: { phone: dto.phone },
      update: {},
      create: {
        phone: dto.phone,
        role: Role.CUSTOMER,
        customer: { create: { fullName: 'New Customer' } },
      },
    });

    return this.issueTokens(user.id, user.role, user.phone);
  }

  async refresh(refreshToken: string): Promise<Tokens> {
    let payload: { sub: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenHash = this.hash(refreshToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: { userId: payload.sub, tokenHash, revokedAt: null },
    });
    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Rotate: revoke the used token, issue a fresh pair.
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: payload.sub },
    });
    return this.issueTokens(user.id, user.role, user.phone);
  }

  private async issueTokens(
    userId: string,
    role: string,
    phone: string,
  ): Promise<Tokens> {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, role, phone },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: (this.config.get<string>('JWT_ACCESS_TTL') ??
          '900s') as JwtSignOptions['expiresIn'],
      },
    );

    const refreshToken = await this.jwt.signAsync(
      { sub: userId },
      {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: (this.config.get<string>('JWT_REFRESH_TTL') ??
          '30d') as JwtSignOptions['expiresIn'],
      },
    );

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hash(refreshToken),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken };
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}
