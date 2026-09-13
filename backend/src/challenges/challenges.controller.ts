import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { ChallengesService } from './challenges.service';
import { CreateChallengeDto } from './dto/create-challenge.dto';
import { SubmitChallengeProgressDto } from './dto/submit-challenge-progress.dto';

@Controller('challenges')
export class ChallengesController {
    constructor(private readonly challengesService: ChallengesService) {}

    @Get()
    @UseGuards(OptionalJwtAuthGuard)
    findActive(@Req() req: any) {
        return this.challengesService.findActive(req.user?.id);
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    create(@Req() req: any, @Body() dto: CreateChallengeDto) {
        return this.challengesService.create(req.user, dto);
    }

    @Get('user')
    @UseGuards(JwtAuthGuard)
    findUserChallenges(@Req() req: any) {
        return this.challengesService.findUserChallenges(req.user.id);
    }

    @Post(':challengeId/join')
    @UseGuards(JwtAuthGuard)
    join(@Req() req: any, @Param('challengeId') challengeId: string) {
        return this.challengesService.join(req.user.id, challengeId);
    }

    @Post(':challengeId/submit')
    @UseGuards(JwtAuthGuard)
    submitProgress(@Req() req: any, @Param('challengeId') challengeId: string, @Body() dto: SubmitChallengeProgressDto) {
        return this.challengesService.submitProgress(req.user.id, challengeId, dto);
    }

    @Get(':challengeId/leaderboard')
    getLeaderboard(@Param('challengeId') challengeId: string) {
        return this.challengesService.getLeaderboard(challengeId);
    }
}
