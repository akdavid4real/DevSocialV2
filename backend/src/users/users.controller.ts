import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Logger,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { UsersService } from './users.service';
import { PostsService } from '../posts/posts.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SaveReadyPlayerAvatarDto } from './dto/save-ready-player-avatar.dto';
import { UpdateAppearanceSettingsDto } from './dto/appearance-settings.dto';
import { UpdatePrivacySettingsDto } from './dto/privacy-settings.dto';
import { UpdateNotificationSettingsDto } from './dto/notification-settings.dto';

@Controller('users')
export class UsersController {
    private readonly logger = new Logger(UsersController.name);

    constructor(
        private readonly usersService: UsersService,
        private readonly postsService: PostsService,
        private readonly prisma: PrismaService,
    ) {}

    @UseGuards(JwtAuthGuard)
    @Get('profile')
    getProfile(@Request() req: any) {
        return req.user;
    }

    @Get('leaderboard')
    async getLeaderboard(
        @Query('period') period?: string,
        @Query('limit') limit?: string,
    ) {
        const requestedLimit = limit ? parseInt(limit) : 50;
        const limitNum = Math.min(Math.max(Number.isFinite(requestedLimit) ? requestedLimit : 50, 1), 100);
        const periodFilter = period || 'all';

        let dateFilter: Date | undefined;
        if (periodFilter === 'week') {
            dateFilter = new Date();
            dateFilter.setDate(dateFilter.getDate() - 7);
        } else if (periodFilter === 'month') {
            dateFilter = new Date();
            dateFilter.setMonth(dateFilter.getMonth() - 1);
        }

        const users = await this.prisma.user.findMany({
            where: dateFilter ? { createdAt: { gte: dateFilter } } : undefined,
            select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
                level: true,
                points: true,
            },
            orderBy: [{ points: 'desc' }, { level: 'desc' }],
            take: limitNum,
        });

        return { users };
    }

    @Get('search')
    async search(@Query('q') query: string) {
        if (!query?.trim()) return [];
        return this.usersService.searchUsers(query.trim());
    }

    @UseGuards(JwtAuthGuard)
    @Patch('profile')
    updateProfile(@Request() req: any, @Body() updateData: UpdateProfileDto) {
        return this.usersService.updateProfile(req.user.id, updateData);
    }

    @UseGuards(JwtAuthGuard)
    @Post('avatar/ready-player-me')
    saveReadyPlayerAvatar(@Request() req: any, @Body() dto: SaveReadyPlayerAvatarDto) {
        return this.usersService.saveReadyPlayerAvatar(req.user.id, dto.avatarUrl);
    }

    @UseGuards(JwtAuthGuard)
    @Get('appearance-settings')
    getAppearanceSettings(@Request() req: any) {
        return this.usersService.getAppearanceSettings(req.user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Put('appearance-settings')
    updateAppearanceSettings(@Request() req: any, @Body() dto: UpdateAppearanceSettingsDto) {
        return this.usersService.updateAppearanceSettings(req.user.id, dto);
    }

    @UseGuards(JwtAuthGuard)
    @Get('privacy')
    getPrivacySettings(@Request() req: any) {
        return this.usersService.getPrivacySettings(req.user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Patch('privacy')
    updatePrivacySettings(@Request() req: any, @Body() dto: UpdatePrivacySettingsDto) {
        return this.usersService.updatePrivacySettings(req.user.id, dto.privacySettings);
    }

    @UseGuards(JwtAuthGuard)
    @Get('notification-settings')
    getNotificationSettings(@Request() req: any) {
        return this.usersService.getNotificationSettings(req.user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Patch('notification-settings')
    updateNotificationSettings(@Request() req: any, @Body() dto: UpdateNotificationSettingsDto) {
        return this.usersService.updateNotificationSettings(req.user.id, dto.notificationSettings);
    }

    @UseGuards(JwtAuthGuard)
    @Get('blocked')
    getBlockedUsers(@Request() req: any) {
        return this.usersService.getBlockedUsers(req.user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Post('block/:userId')
    blockUser(@Request() req: any, @Param('userId') userId: string) {
        return this.usersService.blockUser(req.user.id, userId);
    }

    @UseGuards(JwtAuthGuard)
    @Delete('unblock/:userId')
    unblockUser(@Request() req: any, @Param('userId') userId: string) {
        return this.usersService.unblockUser(req.user.id, userId);
    }

    @UseGuards(JwtAuthGuard)
    @Get('security-stats')
    getSecurityStats(@Request() req: any) {
        return this.usersService.getSecurityStats(req.user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Get('ai-usage')
    getAiUsage(@Request() req: any) {
        return this.usersService.getAiUsage(req.user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Get('dashboard')
    getDashboard(@Request() req: any, @Query('period') period?: string) {
        return this.usersService.getDashboard(req.user.id, period);
    }

    @UseGuards(JwtAuthGuard)
    @Post('export-data')
    exportData(@Request() req: any) {
        return this.usersService.exportUserData(req.user.id);
    }

    @Get(':username')
    @UseGuards(OptionalJwtAuthGuard)
    async getProfileByUsername(@Param('username') username: string, @Request() req: any) {
        const visibleUser = await this.resolveVisibleUser(username, req.user?.id);
        return this.usersService.findByUsername(visibleUser.username);
    }

    @Get(':username/posts')
    @UseGuards(OptionalJwtAuthGuard)
    async getPostsByUsername(@Param('username') username: string, @Request() req: any) {
        const user = await this.resolveVisibleUser(username, req.user?.id);
        return this.postsService.findAllByUser(user.id);
    }

    @UseGuards(OptionalJwtAuthGuard)
    @Get(':username/activities')
    async getUserActivities(
        @Param('username') username: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Request() req?: any,
    ) {
        const user = await this.resolveVisibleUser(username, req?.user?.id, true);
        const { pageNum, limitNum, skip } = this.pagination(page, limit);

        const [activities, total] = await Promise.all([
            this.prisma.activity.findMany({
                where: { userId: user.id },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limitNum,
            }),
            this.prisma.activity.count({ where: { userId: user.id } }),
        ]);

        return {
            success: true,
            data: activities,
            pagination: { page: pageNum, limit: limitNum, total },
        };
    }

    @UseGuards(OptionalJwtAuthGuard)
    @Get(':username/liked-posts')
    async getLikedPosts(
        @Param('username') username: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Request() req?: any,
    ) {
        const user = await this.resolveVisibleUser(username, req?.user?.id);
        const { limitNum, skip } = this.pagination(page, limit);

        const likes = await this.prisma.like.findMany({
            where: { userId: user.id, targetType: 'POST' },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limitNum,
        });

        return this.hydratePosts(likes.map((like) => like.targetId), req?.user?.id);
    }

    @UseGuards(OptionalJwtAuthGuard)
    @Get(':username/commented-posts')
    async getCommentedPosts(
        @Param('username') username: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Request() req?: any,
    ) {
        const user = await this.resolveVisibleUser(username, req?.user?.id);
        const { limitNum, skip } = this.pagination(page, limit);

        const comments = await this.prisma.comment.findMany({
            where: { authorId: user.id },
            orderBy: { createdAt: 'desc' },
            distinct: ['postId'],
            skip,
            take: limitNum,
            select: { postId: true },
        });

        return this.hydratePosts(comments.map((comment) => comment.postId), req?.user?.id);
    }

    @UseGuards(OptionalJwtAuthGuard)
    @Get(':username/stats')
    async getUserStats(@Param('username') username: string, @Request() req?: any) {
        const user = await this.resolveVisibleUser(username, req?.user?.id);
        const ownedPostIds = await this.prisma.post.findMany({
            where: { authorId: user.id },
            select: { id: true },
        });

        const [postsCount, commentsCount, likesGiven, likesReceived] = await Promise.all([
            this.prisma.post.count({ where: { authorId: user.id } }),
            this.prisma.comment.count({ where: { authorId: user.id } }),
            this.prisma.like.count({ where: { userId: user.id } }),
            this.prisma.like.count({
                where: {
                    targetType: 'POST',
                    targetId: { in: ownedPostIds.map((post) => post.id) },
                },
            }),
        ]);

        return {
            success: true,
            data: { postsCount, commentsCount, likesGiven, likesReceived },
        };
    }

    @UseGuards(OptionalJwtAuthGuard)
    @Get(':username/activity-heatmap')
    async getActivityHeatmap(@Param('username') username: string, @Request() req?: any) {
        const user = await this.resolveVisibleUser(username, req?.user?.id, true);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 84);

        const [posts, comments, likes] = await Promise.all([
            this.prisma.post.findMany({
                where: { authorId: user.id, createdAt: { gte: startDate } },
                select: { createdAt: true },
            }),
            this.prisma.comment.findMany({
                where: { authorId: user.id, createdAt: { gte: startDate } },
                select: { createdAt: true },
            }),
            this.prisma.like.findMany({
                where: { userId: user.id, createdAt: { gte: startDate } },
                select: { createdAt: true },
            }),
        ]);

        const activityMap = new Map<string, number>();
        [...posts, ...comments, ...likes].forEach((item) => {
            const date = item.createdAt.toISOString().split('T')[0];
            activityMap.set(date, (activityMap.get(date) || 0) + 1);
        });

        return Array.from(activityMap.entries()).map(([date, count]) => ({ date, count }));
    }

    @UseGuards(JwtAuthGuard)
    @Post(':username/pin-post')
    async pinPost(
        @Param('username') username: string,
        @Body('postId') postId: string,
        @Request() req: any,
    ) {
        if (req.user.username?.toLowerCase() !== username.toLowerCase()) {
            throw new ForbiddenException('Unauthorized');
        }

        const user = await this.prisma.user.findUnique({
            where: { id: req.user.id },
            select: { pinnedPosts: true },
        });
        if (!user) throw new NotFoundException('User not found');
        if (user.pinnedPosts.includes(postId)) return { success: false, message: 'Post already pinned' };
        if (user.pinnedPosts.length >= 3) return { success: false, message: 'Maximum 3 posts can be pinned' };

        const post = await this.prisma.post.findFirst({
            where: { id: postId, authorId: req.user.id },
            select: { id: true },
        });
        if (!post) throw new NotFoundException('Post not found');

        await this.prisma.user.update({
            where: { id: req.user.id },
            data: { pinnedPosts: [...user.pinnedPosts, postId] },
        });
        return { success: true, message: 'Post pinned successfully' };
    }

    @UseGuards(JwtAuthGuard)
    @Delete(':username/unpin-post/:postId')
    async unpinPost(
        @Param('username') username: string,
        @Param('postId') postId: string,
        @Request() req: any,
    ) {
        if (req.user.username?.toLowerCase() !== username.toLowerCase()) {
            throw new ForbiddenException('Unauthorized');
        }

        const user = await this.prisma.user.findUnique({
            where: { id: req.user.id },
            select: { pinnedPosts: true },
        });
        if (!user) throw new NotFoundException('User not found');

        await this.prisma.user.update({
            where: { id: req.user.id },
            data: { pinnedPosts: user.pinnedPosts.filter((id) => id !== postId) },
        });
        return { success: true, message: 'Post unpinned successfully' };
    }

    @UseGuards(OptionalJwtAuthGuard)
    @Get(':username/pinned-posts')
    async getPinnedPosts(@Param('username') username: string, @Request() req?: any) {
        const visibleUser = await this.resolveVisibleUser(username, req?.user?.id);
        const user = await this.prisma.user.findUnique({
            where: { id: visibleUser.id },
            select: { pinnedPosts: true },
        });
        if (!user || user.pinnedPosts.length === 0) return [];

        const posts = await this.hydratePosts(user.pinnedPosts, req?.user?.id);
        return user.pinnedPosts
            .map((pinnedId) => posts.find((post: any) => post.id === pinnedId))
            .filter(Boolean)
            .map((post: any) => ({ ...post, isPinned: true }));
    }

    private pagination(page?: string, limit?: string) {
        const rawPage = page ? parseInt(page) : 1;
        const rawLimit = limit ? parseInt(limit) : 20;
        const pageNum = Math.max(Number.isFinite(rawPage) ? rawPage : 1, 1);
        const limitNum = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 20, 1), 100);
        return { pageNum, limitNum, skip: (pageNum - 1) * limitNum };
    }

    private normalizeSettings(value: unknown): Record<string, unknown> {
        return value && typeof value === 'object' && !Array.isArray(value)
            ? value as Record<string, unknown>
            : {};
    }

    private async resolveVisibleUser(username: string, viewerId?: string, requireActivityVisibility = false) {
        const user = await this.prisma.user.findFirst({
            where: { username: { equals: username, mode: 'insensitive' } },
            select: { id: true, username: true, privacySettings: true },
        });
        if (!user) throw new NotFoundException(`User @${username} not found`);
        if (viewerId === user.id) return user;

        if (viewerId) {
            const block = await this.prisma.block.findFirst({
                where: {
                    OR: [
                        { blockerId: viewerId, blockedId: user.id },
                        { blockerId: user.id, blockedId: viewerId },
                    ],
                },
                select: { id: true },
            });
            if (block) throw new NotFoundException(`User @${username} not found`);
        }

        const settings = this.normalizeSettings(user.privacySettings);
        if (requireActivityVisibility && settings.showActivityStatus === false) {
            throw new NotFoundException('Activity is private');
        }

        if (String(settings.profileVisibility || 'PUBLIC').toUpperCase() === 'PRIVATE') {
            if (!viewerId) throw new NotFoundException(`User @${username} not found`);
            const follows = await this.prisma.follow.findUnique({
                where: {
                    followerId_followingId: {
                        followerId: viewerId,
                        followingId: user.id,
                    },
                },
                select: { id: true },
            });
            if (!follows) throw new NotFoundException(`User @${username} not found`);
        }

        return user;
    }

    private async hydratePosts(postIds: string[], viewerId?: string) {
        if (postIds.length === 0) return [];
        const [posts, likeCounts, viewerLikes] = await Promise.all([
            this.prisma.post.findMany({
                where: { id: { in: postIds }, status: 'ACTIVE' },
                include: {
                    author: {
                        select: {
                            id: true,
                            username: true,
                            displayName: true,
                            avatar: true,
                            level: true,
                        },
                    },
                    _count: { select: { comments: true } },
                },
            }),
            this.prisma.like.groupBy({
                by: ['targetId'],
                where: { targetId: { in: postIds }, targetType: 'POST' },
                _count: true,
            }),
            viewerId
                ? this.prisma.like.findMany({
                    where: { userId: viewerId, targetId: { in: postIds }, targetType: 'POST' },
                    select: { targetId: true },
                })
                : Promise.resolve([]),
        ]);

        const likeCountMap = new Map(likeCounts.map((like) => [like.targetId, like._count]));
        const viewerLikeSet = new Set(viewerLikes.map((like) => like.targetId));
        return posts.map((post) => ({
            ...post,
            isLiked: viewerLikeSet.has(post.id),
            likesCount: likeCountMap.get(post.id) || 0,
            commentsCount: post._count.comments,
        }));
    }
}
