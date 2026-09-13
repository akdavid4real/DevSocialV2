import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
    constructor(private readonly searchService: SearchService) {}

    @Get()
    search(
        @Query('q') query: string,
        @Query('type') type?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.searchService.search({
            query,
            type: type || 'all',
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 20,
        });
    }
}
