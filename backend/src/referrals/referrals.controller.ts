import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ValidateReferralCodeDto } from './dto/validate-referral-code.dto';
import { ReferralsService } from './referrals.service';

@Controller('referrals')
export class ReferralsController {
    constructor(private readonly referralsService: ReferralsService) {}

    @Get('code')
    @UseGuards(JwtAuthGuard)
    getCode(@Req() req: any) {
        return this.referralsService.getOrCreateReferralCode(req.user.id);
    }

    @Get('stats')
    @UseGuards(JwtAuthGuard)
    getStats(@Req() req: any) {
        return this.referralsService.getStats(req.user.id);
    }

    @Post('validate')
    validate(@Body() dto: ValidateReferralCodeDto) {
        return this.referralsService.validateReferralCode(dto.referralCode);
    }

    @Post('expire-old')
    @UseGuards(JwtAuthGuard)
    expireOld() {
        return this.referralsService.expireOldReferrals();
    }
}
