import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CommunitiesService } from './communities.service';
import { CreateCommunityDto } from './dto/create-community.dto';
import { CreateCommunityPostDto } from './dto/create-community-post.dto';

@Controller('communities')
export class CommunitiesController {
    constructor(private readonly communitiesService: CommunitiesService) {}

    @Get()
    findAll(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('search') search?: string,
        @Query('category') category?: string,
    ) {
        return this.communitiesService.findAll({
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 12,
            search,
            category,
        });
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    create(@Req() req: any, @Body() dto: CreateCommunityDto) {
        return this.communitiesService.create(req.user.id, dto);
    }

    @Get(':idOrSlug')
    findOne(@Param('idOrSlug') idOrSlug: string) {
        return this.communitiesService.findOne(idOrSlug);
    }

    @Post(':idOrSlug/join')
    @UseGuards(JwtAuthGuard)
    toggleMembership(@Req() req: any, @Param('idOrSlug') idOrSlug: string) {
        return this.communitiesService.toggleMembership(req.user.id, idOrSlug);
    }

    @Get(':idOrSlug/posts')
    findPosts(
        @Param('idOrSlug') idOrSlug: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.communitiesService.findPosts(
            idOrSlug,
            page ? parseInt(page) : 1,
            limit ? parseInt(limit) : 10,
        );
    }

    @Post(':idOrSlug/posts')
    @UseGuards(JwtAuthGuard)
    createPost(
        @Req() req: any,
        @Param('idOrSlug') idOrSlug: string,
        @Body() dto: CreateCommunityPostDto,
    ) {
        return this.communitiesService.createPost(req.user.id, idOrSlug, dto);
    }
}
