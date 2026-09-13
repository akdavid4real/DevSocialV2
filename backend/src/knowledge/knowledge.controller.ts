import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateKnowledgeEntryDto } from './dto/create-knowledge-entry.dto';
import { KnowledgeService } from './knowledge.service';

@Controller('knowledge-bank')
export class KnowledgeController {
    constructor(private readonly knowledgeService: KnowledgeService) {}

    @Get()
    findAll(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('technology') technology?: string,
        @Query('category') category?: string,
        @Query('search') search?: string,
    ) {
        return this.knowledgeService.findAll({
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20,
            technology,
            category,
            search,
        });
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    create(@Req() req: any, @Body() dto: CreateKnowledgeEntryDto) {
        return this.knowledgeService.create(req.user.id, dto);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.knowledgeService.findOne(id);
    }
}
