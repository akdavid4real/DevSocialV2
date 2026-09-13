import { Controller, Get, Put, Body, UseGuards, Request, Logger } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { UpdateOnboardingDto } from './dto/update-onboarding.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('users/onboarding')
@UseGuards(JwtAuthGuard)
export class OnboardingController {
    private readonly logger = new Logger(OnboardingController.name);

    constructor(private readonly onboardingService: OnboardingService) { }

    @Get()
    async getOnboardingStatus(@Request() req: any) {
        this.logger.log(`Fetching onboarding status for user ${req.user.id}`);
        return this.onboardingService.getStatus(req.user.id);
    }

    @Put()
    async updateOnboarding(@Request() req: any, @Body() data: UpdateOnboardingDto) {
        this.logger.log(`Updating onboarding data for user ${req.user.id}`);
        return this.onboardingService.update(req.user.id, data);
    }
}
