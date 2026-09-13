import {
    ConflictException,
    Injectable,
    InternalServerErrorException,
    UnauthorizedException,
    BadRequestException,
    ForbiddenException,
    Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma/prisma.service';
import { SupabaseService } from '../common/supabase/supabase.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyDto } from './dto/verify.dto';
import { ConfigService } from '@nestjs/config';
import { ReferralsService } from '../referrals/referrals.service';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly supabase: SupabaseService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly referralsService: ReferralsService,
    ) { }

    async register(dto: RegisterDto) {
        if (dto.referralCode) {
            const validation = await this.referralsService.validateReferralCode(dto.referralCode);
            if (!validation.valid) {
                throw new BadRequestException('Invalid referral code');
            }
        }

        // 1. Create user in Supabase Auth (standard signUp to trigger emails)
        const { data: authData, error: authError } = await this.supabase.client.auth.signUp({
            email: dto.email,
            password: dto.password,
            options: {
                data: {
                    username: dto.username,
                    full_name: `${dto.firstName} ${dto.lastName}`,
                },
            },
        });

        if (authError || !authData.user) {
            if (authError?.message.includes('already registered')) {
                throw new ConflictException('User with this email already exists');
            }
            throw new InternalServerErrorException(authError?.message || 'Failed to create auth user');
        }

        const userId = authData.user.id;

        // 2. Create user in our Postgres DB via Prisma
        try {
            const user = await this.prisma.user.create({
                data: {
                    supabaseAuthId: userId,
                    email: dto.email,
                    username: dto.username,
                    firstName: dto.firstName,
                    lastName: dto.lastName,
                    displayName: `${dto.firstName} ${dto.lastName}`,
                    birthMonth: dto.birthMonth,
                    birthDay: dto.birthDay,
                    affiliation: dto.affiliation || "Other",
                    // Initialize user stats (optionally done via trigger or separate call)
                },
            });

            // Initialize user stats
            await this.prisma.userStats.create({
                data: {
                    userId: user.id,
                },
            });

            if (dto.referralCode) {
                await this.referralsService.createCompletedReferral(dto.referralCode, user.id);
            }

            return user;
        } catch (dbError) {
            // Rollback Supabase user if DB creation fails
            await this.supabase.client.auth.admin.deleteUser(userId);

            if (dbError.code === 'P2002') {
                throw new ConflictException('Username or email already taken in database');
            }
            throw new InternalServerErrorException('Failed to create user profile');
        }
    }

    async verifyOtp(dto: VerifyDto) {
        const { data, error } = await this.supabase.client.auth.verifyOtp({
            email: dto.email,
            token: dto.token,
            type: 'signup',
        });

        if (error || !data.user) {
            this.logger.error(`OTP Verification failed: ${error?.message || 'No user data returned'}`);
            throw new BadRequestException(error?.message || 'Verification failed');
        }

        // The user is now verified in Supabase. 
        // We can also update our local User record if we have a 'isVerified' flag.
        await this.prisma.user.update({
            where: { supabaseAuthId: data.user.id },
            data: { isVerified: true },
        });

        return {
            success: true,
            message: 'Email verified successfully',
            user: data.user,
        };
    }

    async forgotPassword(dto: { email: string }) {
        const email = dto.email.toLowerCase();
        const redirectTo = `${this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173'}/auth/reset-password`;
        const genericResponse = {
            success: true,
            message: "If an account with that email exists, we've sent a password reset link.",
        };

        const user = await this.prisma.user.findUnique({
            where: { email },
            select: { id: true },
        });

        if (!user) {
            return genericResponse;
        }

        const { error } = await this.supabase.client.auth.resetPasswordForEmail(email, {
            redirectTo,
        });

        if (error) {
            this.logger.error(`Password reset request failed for ${email}: ${error.message}`);
            throw new InternalServerErrorException('Failed to process password reset request');
        }

        return genericResponse;
    }

    async login(dto: LoginDto) {
        let email = dto.usernameOrEmail;

        // If it is a username, we need to find the email first
        if (!email.includes('@')) {
            const userRecord = await this.prisma.user.findUnique({
                where: { username: email },
                select: { email: true },
            });

            if (!userRecord) {
                throw new UnauthorizedException('Invalid credentials');
            }
            email = userRecord.email;
        }

        const { data, error } = await this.supabase.client.auth.signInWithPassword({
            email,
            password: dto.password,
        });

        if (error) {
            if (error.message.toLowerCase().includes('email not confirmed')) {
                throw new UnauthorizedException('Please verify your email address before logging in.');
            }
            throw new UnauthorizedException('Invalid credentials');
        }

        // Fetch our user record to include in response
        const user = await this.prisma.user.findUnique({
            where: { supabaseAuthId: data.user.id },
        });

        if (!user) {
            throw new UnauthorizedException('User profile not found');
        }

        // 3. Generate our own JWT for the backend session
        const accessToken = this.jwtService.sign({
            sub: user.id,
            email: user.email,
            role: user.role,
        });

        return {
            user,
            session: {
                access_token: accessToken,
                supabase_token: data.session.access_token, // Pass along if needed for storage etc.
            },
        };
    }

    async devVerifyUser(email: string) {
        // 1. Get user by email to get their ID
        const { data: { users }, error: listError } = await this.supabase.client.auth.admin.listUsers();
        const authUser = users?.find((u: any) => u.email === email);

        if (!authUser) {
            throw new BadRequestException('User not found in Supabase');
        }

        // 2. Confirm user in Supabase
        const { error: updateError } = await this.supabase.client.auth.admin.updateUserById(
            authUser.id,
            { email_confirm: true }
        );

        if (updateError) {
            throw new InternalServerErrorException(updateError.message);
        }

        // 3. Update local DB
        await this.prisma.user.update({
            where: { supabaseAuthId: authUser.id },
            data: { isVerified: true },
        });

        return { success: true, message: `User ${email} verified (Dev Mode)` };
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
                avatar: true,
                bannerUrl: true,
                bio: true,
                location: true,
                techCareerPath: true,
                techStack: true,
                experienceLevel: true,
                githubUsername: true,
                linkedinUrl: true,
                portfolioUrl: true,
                isVerified: true,
                createdAt: true,
            },
        });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        return { data: user };
    }

    async changePassword(userId: string, dto: { currentPassword: string; newPassword: string }) {
        // Get user to get their Supabase auth ID
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { supabaseAuthId: true, email: true },
        });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        // Verify current password by attempting to sign in
        const { error: signInError } = await this.supabase.client.auth.signInWithPassword({
            email: user.email,
            password: dto.currentPassword,
        });

        if (signInError) {
            throw new UnauthorizedException('Current password is incorrect');
        }

        // Update password in Supabase
        const { error: updateError } = await this.supabase.client.auth.admin.updateUserById(
            user.supabaseAuthId,
            { password: dto.newPassword }
        );

        if (updateError) {
            throw new InternalServerErrorException('Failed to update password');
        }

        return { success: true, message: 'Password changed successfully' };
    }

    async deleteAccount(userId: string) {
        // Get user to get their Supabase auth ID
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { supabaseAuthId: true },
        });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        // Delete from Supabase Auth (this cascades)
        const { error } = await this.supabase.client.auth.admin.deleteUser(user.supabaseAuthId);

        if (error) {
            throw new InternalServerErrorException('Failed to delete account from auth');
        }

        // Delete from our database (cascade will handle relations)
        await this.prisma.user.delete({
            where: { id: userId },
        });

        return { success: true, message: 'Account deleted successfully' };
    }

    async getSessions(userId: string) {
        // TODO: Implement proper session tracking with Redis or database
        // For now, return mock data with current session
        return {
            data: {
                sessions: [
                    {
                        id: '1',
                        deviceType: 'desktop',
                        browser: 'Chrome',
                        os: 'Windows 11',
                        ipAddress: '192.168.1.1',
                        location: 'Lagos, Nigeria',
                        lastActive: new Date().toISOString(),
                        isCurrent: true,
                    },
                ],
            },
        };
    }

    async logoutSession(userId: string, sessionId: string) {
        // TODO: Implement session invalidation
        // For now, just return success
        return {
            success: true,
            message: 'Session logged out successfully',
        };
    }

    async logoutAll(userId: string) {
        // TODO: Invalidate all sessions for this user
        // For now, just return success
        return {
            success: true,
            message: 'Logged out from all devices',
        };
    }
}
