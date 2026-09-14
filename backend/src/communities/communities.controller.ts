import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CommunitiesService } from './communities.service';
import { CreateCommunityDto } from './dto/create-community.dto';
import { CreateCommunityPostDto } from './dto/create-community-post.dto';

@Controller('communities')
export class CommunitiesController {
    constructor(private readonly communitiesService: CommunitiesService) {}

    @Get()
    @UseGuards(OptionalJwtAuthGuard)
    findAll(
        @Req() req: any,
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
            viewerId: req.user?.id,
        });
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    create(@Req() req: any, @Body() dto: CreateCommunityDto) {
        return this.communitiesService.create(req.user.id, dto);
    }

    @Get(':idOrSlug')
    @UseGuards(OptionalJwtAuthGuard)
    findOne(@Req() req: any, @Param('idOrSlug') idOrSlug: string) {
        return this.communitiesService.findOne(idOrSlug, req.user?.id);
    }

    @Post(':idOrSlug/join')
    @UseGuards(JwtAuthGuard)
    toggleMembership(@Req() req: any, @Param('idOrSlug') idOrSlug: string) {
        return this.communitiesService.toggleMembership(req.user.id, idOrSlug);
    }

    @Get(':idOrSlug/posts')
    @UseGuards(OptionalJwtAuthGuard)
    findPosts(
        @Req() req: any,
        @Param('idOrSlug') idOrSlug: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.communitiesService.findPosts(
            idOrSlug,
            page ? parseInt(page) : 1,
            limit ? parseInt(limit) : 10,
            req.user?.id,
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
