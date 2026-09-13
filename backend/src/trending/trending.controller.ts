import { Controller, Get, Query, Logger } from '@nestjs/common';
import { TrendingService } from './trending.service';

@Controller('trending')
export class TrendingController {
    private readonly logger = new Logger(TrendingController.name);
    
    constructor(private readonly trendingService: TrendingService) {}

    @Get()
    async getTrendingData(@Query('period') period?: string) {
        this.logger.log(`Trending endpoint hit with period: ${period}`);
        const result = await this.trendingService.getTrendingData(period || 'today');
        this.logger.log(`Returning ${result.trendingPosts.length} posts, ${result.trendingTopics.length} topics, ${result.risingUsers.length} users`);
        return result;
    }
}
