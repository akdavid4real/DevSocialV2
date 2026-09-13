import { Controller, Post, Delete, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FollowService } from './follow.service';

@Controller('follow')
@UseGuards(JwtAuthGuard)
export class FollowController {
    constructor(private readonly followService: FollowService) {}

    @Post(':userId')
    async followUser(@Request() req: any, @Param('userId') userId: string) {
        return this.followService.followUser(req.user.id, userId);
    }

    @Delete(':userId')
    async unfollowUser(@Request() req: any, @Param('userId') userId: string) {
        return this.followService.unfollowUser(req.user.id, userId);
    }

    @Get(':userId/is-following')
    async isFollowing(@Request() req: any, @Param('userId') userId: string) {
        return this.followService.isFollowing(req.user.id, userId);
    }

    @Get(':userId/followers')
    async getFollowers(
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
    async getFollowing(
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
    async getMutualFollowers(@Request() req: any, @Param('userId') userId: string) {
        return this.followService.getMutualFollowers(req.user.id, userId);
    }
}
