import { Controller, Post, Delete, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FollowService } from './follow.service';

@Controller('follow')
@UseGuards(JwtAuthGuard)
export class FollowController {
    constructor(private readonly followService: FollowService) {}

    @Get('requests/incoming')
    getIncomingRequests(
        @Request() req: any,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.followService.getIncomingRequests(
            req.user.id,
            page ? parseInt(page) : 1,
            limit ? parseInt(limit) : 20,
        );
    }

    @Get('requests/outgoing')
    getOutgoingRequests(
        @Request() req: any,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.followService.getOutgoingRequests(
            req.user.id,
            page ? parseInt(page) : 1,
            limit ? parseInt(limit) : 20,
        );
    }

    @Post('requests/:requestId/accept')
    acceptFollowRequest(@Request() req: any, @Param('requestId') requestId: string) {
        return this.followService.acceptFollowRequest(req.user.id, requestId);
    }

    @Post('requests/:requestId/reject')
    rejectFollowRequest(@Request() req: any, @Param('requestId') requestId: string) {
        return this.followService.rejectFollowRequest(req.user.id, requestId);
    }

    @Delete('requests/:requestId')
    cancelFollowRequest(@Request() req: any, @Param('requestId') requestId: string) {
        return this.followService.cancelFollowRequest(req.user.id, requestId);
    }

    @Post(':userId')
    followUser(@Request() req: any, @Param('userId') userId: string) {
        return this.followService.followUser(req.user.id, userId);
    }

    @Delete(':userId')
    unfollowUser(@Request() req: any, @Param('userId') userId: string) {
        return this.followService.unfollowUser(req.user.id, userId);
    }

    @Get(':userId/is-following')
    isFollowing(@Request() req: any, @Param('userId') userId: string) {
        return this.followService.isFollowing(req.user.id, userId);
    }

    @Get(':userId/followers')
    getFollowers(
        @Param('userId') userId: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.followService.getFollowers(
            userId,
            page ? parseInt(page) : 1,
            limit ? parseInt(limit) : 20,
        );
    }

    @Get(':userId/following')
    getFollowing(
        @Param('userId') userId: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.followService.getFollowing(
            userId,
            page ? parseInt(page) : 1,
            limit ? parseInt(limit) : 20,
        );
    }

    @Get(':userId/mutual-followers')
    getMutualFollowers(@Request() req: any, @Param('userId') userId: string) {
        return this.followService.getMutualFollowers(req.user.id, userId);
    }
}
