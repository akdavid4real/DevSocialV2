import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CommunitiesService } from './communities.service';
import { CommunityAccessService } from './community-access.service';
import { CreateCommunityDto } from './dto/create-community.dto';
import { CreateCommunityPostDto } from './dto/create-community-post.dto';

@Controller('communities')
export class CommunitiesController {
    constructor(
        private readonly communitiesService: CommunitiesService,
        private readonly accessService: CommunityAccessService,
    ) {}

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

    @Get('invitations/me')
    @UseGuards(JwtAuthGuard)
    getMyInvites(
        @Req() req: any,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.accessService.getMyInvites(
            req.user.id,
            page ? parseInt(page) : 1,
            limit ? parseInt(limit) : 20,
        );
    }

    @Post('invitations/:inviteId/accept')
    @UseGuards(JwtAuthGuard)
    acceptInvite(@Req() req: any, @Param('inviteId') inviteId: string) {
        return this.accessService.respondToInvite(req.user.id, inviteId, true);
    }

    @Post('invitations/:inviteId/reject')
    @UseGuards(JwtAuthGuard)
    rejectInvite(@Req() req: any, @Param('inviteId') inviteId: string) {
        return this.accessService.respondToInvite(req.user.id, inviteId, false);
    }

    @Delete('join-requests/:requestId')
    @UseGuards(JwtAuthGuard)
    cancelJoinRequest(@Req() req: any, @Param('requestId') requestId: string) {
        return this.accessService.cancelJoinRequest(req.user.id, requestId);
    }

    @Get(':idOrSlug/join-requests')
    @UseGuards(JwtAuthGuard)
    getJoinRequests(
        @Req() req: any,
        @Param('idOrSlug') idOrSlug: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.accessService.getJoinRequests(
            req.user.id,
            idOrSlug,
            page ? parseInt(page) : 1,
            limit ? parseInt(limit) : 20,
        );
    }

    @Post(':idOrSlug/join-requests/:requestId/accept')
    @UseGuards(JwtAuthGuard)
    acceptJoinRequest(
        @Req() req: any,
        @Param('idOrSlug') idOrSlug: string,
        @Param('requestId') requestId: string,
    ) {
        return this.accessService.reviewJoinRequest(req.user.id, idOrSlug, requestId, true);
    }

    @Post(':idOrSlug/join-requests/:requestId/reject')
    @UseGuards(JwtAuthGuard)
    rejectJoinRequest(
        @Req() req: any,
        @Param('idOrSlug') idOrSlug: string,
        @Param('requestId') requestId: string,
    ) {
        return this.accessService.reviewJoinRequest(req.user.id, idOrSlug, requestId, false);
    }

    @Post(':idOrSlug/invites/:userId')
    @UseGuards(JwtAuthGuard)
    inviteUser(
        @Req() req: any,
        @Param('idOrSlug') idOrSlug: string,
        @Param('userId') userId: string,
    ) {
        return this.accessService.inviteUser(req.user.id, idOrSlug, userId);
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
