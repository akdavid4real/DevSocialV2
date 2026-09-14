import { Controller, Get, Query, Logger, Req, UseGuards } from '@nestjs/common';
import { TrendingService } from './trending.service';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@Controller('trending')
export class TrendingController {
    private readonly logger = new Logger(TrendingController.name);

    constructor(private readonly trendingService: TrendingService) {}

    @Get()
    @UseGuards(OptionalJwtAuthGuard)
    async getTrendingData(@Req() req: any, @Query('period') period?: string) {
        const result = await this.trendingService.getTrendingData(period || 'today', req.user?.id);
        this.logger.debug(`Trending: ${result.trendingPosts.length} posts for viewer ${req.user?.id || 'guest'}`);
        return result;
    }
}
