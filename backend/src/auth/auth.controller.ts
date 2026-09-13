import { Controller, Post, Body, HttpCode, HttpStatus, ForbiddenException, Get, UseGuards, Req, Delete, Param } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyDto } from './dto/verify.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('register')
    async register(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto);
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto);
    }

    @Post('verify')
    @HttpCode(HttpStatus.OK)
    async verify(@Body() verifyDto: VerifyDto) {
        return this.authService.verifyOtp(verifyDto);
    }

    @Post('forgot-password')
    @HttpCode(HttpStatus.OK)
    async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
        return this.authService.forgotPassword(forgotPasswordDto);
    }

    @Post('dev/verify')
    @HttpCode(HttpStatus.OK)
    async devVerify(@Body() body: { email: string }) {
        if (process.env.NODE_ENV === 'production') {
            throw new ForbiddenException('Not allowed in production');
        }
        return this.authService.devVerifyUser(body.email);
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    async getMe(@Req() req: any) {
        return this.authService.getMe(req.user.id);
    }

    @Post('change-password')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
        return this.authService.changePassword(req.user.id, dto);
    }

    @Delete('delete-account')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async deleteAccount(@Req() req: any) {
        return this.authService.deleteAccount(req.user.id);
    }

    @Get('sessions')
    @UseGuards(JwtAuthGuard)
    async getSessions(@Req() req: any) {
        return this.authService.getSessions(req.user.id);
    }

    @Delete('sessions/:sessionId')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async logoutSession(@Req() req: any, @Param('sessionId') sessionId: string) {
        return this.authService.logoutSession(req.user.id, sessionId);
    }

    @Post('logout-all')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async logoutAll(@Req() req: any) {
        return this.authService.logoutAll(req.user.id);
    }
}
