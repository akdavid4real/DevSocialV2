import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { SupabaseService } from '../common/supabase/supabase.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyDto } from './dto/verify.dto';
import { ReferralsService } from '../referrals/referrals.service';

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const payload = token.split('.')[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
  } catch {
    return {};
  }
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
    private readonly configService: ConfigService,
    private readonly referralsService: ReferralsService,
  ) {}

  async register(dto: RegisterDto) {
    if (dto.referralCode) {
      const validation = await this.referralsService.validateReferralCode(dto.referralCode);
      if (!validation.valid) throw new BadRequestException('Invalid referral code');
    }

    const email = dto.email.trim().toLowerCase();
    const username = dto.username.trim();
    const { data: authData, error: authError } = await this.supabase.client.auth.signUp({
      email,
      password: dto.password,
      options: {
        data: {
          username,
          full_name: `${dto.firstName} ${dto.lastName}`.trim(),
        },
      },
    });

    if (authError || !authData.user) {
      if (authError?.message.toLowerCase().includes('already registered')) {
        throw new ConflictException('User with this email already exists');
      }
      throw new InternalServerErrorException(authError?.message || 'Failed to create auth user');
    }

    const authUserId = authData.user.id;

    let user: any;
    try {
      user = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            supabaseAuthId: authUserId,
            email,
            username,
            firstName: dto.firstName,
            lastName: dto.lastName,
            displayName: `${dto.firstName} ${dto.lastName}`.trim(),
            birthMonth: dto.birthMonth,
            birthDay: dto.birthDay,
            affiliation: dto.affiliation || 'Other',
          },
        });

        await tx.userStats.create({ data: { userId: created.id } });
        return created;
      });
    } catch (dbError: any) {
      await this.supabase.client.auth.admin.deleteUser(authUserId);
      if (dbError?.code === 'P2002') {
        throw new ConflictException('Username or email already taken in database');
      }
      throw new InternalServerErrorException('Failed to create user profile');
    }

    if (dto.referralCode) {
      try {
        await this.referralsService.createCompletedReferral(dto.referralCode, user.id);
      } catch (error: any) {
        this.logger.warn(`Referral processing failed after registration: ${error?.message || error}`);
      }
    }

    return user;
  }

  async verifyOtp(dto: VerifyDto) {
    const { data, error } = await this.supabase.client.auth.verifyOtp({
      email: dto.email.trim().toLowerCase(),
      token: dto.token,
      type: 'signup',
    });

    if (error || !data.user) {
      this.logger.warn(`OTP verification failed: ${error?.message || 'no user returned'}`);
      throw new BadRequestException(error?.message || 'Verification failed');
    }

    await this.prisma.user.update({
      where: { supabaseAuthId: data.user.id },
      data: { isVerified: true },
    });

    return { success: true, message: 'Email verified successfully' };
  }

  async forgotPassword(dto: { email: string }) {
    const email = dto.email.trim().toLowerCase();
    const redirectTo = `${this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173'}/auth/reset-password`;
    const genericResponse = {
      success: true,
      message: "If an account with that email exists, we've sent a password reset link.",
    };

    const user = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) return genericResponse;

    const { error } = await this.supabase.client.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) {
      this.logger.error(`Password reset request failed: ${error.message}`);
      throw new InternalServerErrorException('Failed to process password reset request');
    }

    return genericResponse;
  }

  private async getLocalUserBySupabaseId(supabaseAuthId: string) {
    const user = await this.prisma.user.findUnique({ where: { supabaseAuthId } });
    if (!user) throw new UnauthorizedException('User profile not found');
    if (user.isBlocked) throw new UnauthorizedException('User is blocked');
    return user;
  }

  async login(dto: LoginDto) {
    let email = dto.usernameOrEmail.trim();

    if (!email.includes('@')) {
      const userRecord = await this.prisma.user.findUnique({
        where: { username: email },
        select: { email: true },
      });
      if (!userRecord) throw new UnauthorizedException('Invalid credentials');
      email = userRecord.email;
    }

    email = email.toLowerCase();
    const { data, error } = await this.supabase.client.auth.signInWithPassword({
      email,
      password: dto.password,
    });

    if (error || !data.session) {
      if (error?.message.toLowerCase().includes('email not confirmed')) {
        throw new UnauthorizedException('Please verify your email address before logging in.');
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = await this.getLocalUserBySupabaseId(data.user.id);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date(), lastActive: new Date() },
    });

    return {
      user,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
    };
  }

  async refreshSession(refreshToken: string) {
    const { data, error } = await this.supabase.client.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session || !data.user) {
      throw new UnauthorizedException('Refresh session is invalid or expired');
    }

    const user = await this.getLocalUserBySupabaseId(data.user.id);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastActive: new Date() },
    });

    return {
      user,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
    };
  }

  async devVerifyUser(email: string) {
    const allowedEmail = this.configService.get<string>('DEV_AUTH_TEST_EMAIL')?.trim().toLowerCase();
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (this.configService.get<string>('NODE_ENV') !== 'development' || !allowedEmail || normalizedEmail !== allowedEmail) {
      throw new ForbiddenException('Development verification is disabled for this account');
    }

    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user?.supabaseAuthId) throw new BadRequestException('Registered account not found');

    const { error } = await this.supabase.client.auth.admin.updateUserById(user.supabaseAuthId, {
      email_confirm: true,
    });
    if (error) throw new InternalServerErrorException(error.message);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true },
    });

    return { success: true, message: `User ${normalizedEmail} verified (Dev Mode)` };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        displayName: true,
        bio: true,
        avatar: true,
        bannerUrl: true,
        role: true,
        affiliation: true,
        techCareerPath: true,
        techStack: true,
        experienceLevel: true,
        githubUsername: true,
        linkedinUrl: true,
        portfolioUrl: true,
        location: true,
        website: true,
        interests: true,
        points: true,
        level: true,
        badges: true,
        loginStreak: true,
        lastStreakDate: true,
        followersCount: true,
        followingCount: true,
        isVerified: true,
        onboardingCompleted: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) throw new UnauthorizedException('User not found');
    return user;
  }

  async changePassword(userId: string, dto: { currentPassword: string; newPassword: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { supabaseAuthId: true, email: true },
    });
    if (!user) throw new UnauthorizedException('User not found');

    const { error: signInError } = await this.supabase.client.auth.signInWithPassword({
      email: user.email,
      password: dto.currentPassword,
    });
    if (signInError) throw new UnauthorizedException('Current password is incorrect');

    const { error: updateError } = await this.supabase.client.auth.admin.updateUserById(
      user.supabaseAuthId,
      { password: dto.newPassword },
    );
    if (updateError) throw new InternalServerErrorException('Failed to update password');

    return { success: true, message: 'Password changed successfully' };
  }

  async deleteAccount(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { supabaseAuthId: true },
    });
    if (!user) throw new UnauthorizedException('User not found');

    const { error } = await this.supabase.client.auth.admin.deleteUser(user.supabaseAuthId);
    if (error) throw new InternalServerErrorException('Failed to delete account from auth');

    await this.prisma.user.delete({ where: { id: userId } });
    return { success: true, message: 'Account deleted successfully' };
  }

  async getSessions(token: string, sessionId?: string | null) {
    const payload = decodeJwtPayload(token);
    const exp = typeof payload.exp === 'number' ? payload.exp * 1000 : null;

    return {
      sessions: [
        {
          id: sessionId || 'current',
          lastActive: new Date().toISOString(),
          expiresAt: exp ? new Date(exp).toISOString() : null,
          isCurrent: true,
        },
      ],
      supportsIndividualSessionListing: false,
    };
  }

  async logoutCurrent(token: string) {
    const { error } = await this.supabase.client.auth.admin.signOut(token, 'local');
    if (error) throw new InternalServerErrorException('Failed to revoke current session');
    return { success: true, message: 'Logged out successfully' };
  }

  async logoutSession(token: string, requestedSessionId: string, currentSessionId?: string | null) {
    if (!currentSessionId || requestedSessionId !== currentSessionId) {
      throw new BadRequestException('Only the current session can be revoked individually');
    }

    const { error } = await this.supabase.client.auth.admin.signOut(token, 'local');
    if (error) throw new InternalServerErrorException('Failed to revoke session');
    return { success: true, message: 'Current session revoked successfully' };
  }

  async logoutAll(token: string) {
    const { error } = await this.supabase.client.auth.admin.signOut(token, 'global');
    if (error) throw new InternalServerErrorException('Failed to revoke sessions');
    return { success: true, message: 'Logged out from all devices' };
  }
}
