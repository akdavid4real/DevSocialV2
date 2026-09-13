import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CreateMissionDto } from './dto/create-mission.dto';
import { UpdateMissionProgressDto } from './dto/update-mission-progress.dto';
import { MissionsService } from './missions.service';

@Controller('missions')
export class MissionsController {
    constructor(private readonly missionsService: MissionsService) {}

    @Get()
    @UseGuards(OptionalJwtAuthGuard)
    findAll(
        @Req() req: any,
        @Query('type') type?: string,
        @Query('difficulty') difficulty?: string,
        @Query('duration') duration?: string,
    ) {
        return this.missionsService.findAll(req.user?.id, { type, difficulty, duration });
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    create(@Req() req: any, @Body() dto: CreateMissionDto) {
        return this.missionsService.create(req.user, dto);
    }

    @Post(':missionId/join')
    @UseGuards(JwtAuthGuard)
    join(@Req() req: any, @Param('missionId') missionId: string) {
        return this.missionsService.join(req.user.id, missionId);
    }

    @Post(':missionId/progress')
    @UseGuards(JwtAuthGuard)
    updateProgress(@Req() req: any, @Param('missionId') missionId: string, @Body() dto: UpdateMissionProgressDto) {
        return this.missionsService.updateProgress(req.user.id, missionId, dto);
    }

    @Delete(':missionId')
    @UseGuards(JwtAuthGuard)
    remove(@Req() req: any, @Param('missionId') missionId: string) {
        return this.missionsService.remove(req.user, missionId);
    }
}
