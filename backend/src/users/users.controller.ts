import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Logger,
  NotFoundException,
  Post,
  Delete,
  Put,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { UsersService } from './users.service';
import { PostsService } from '../posts/posts.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SaveReadyPlayerAvatarDto } from './dto/save-ready-player-avatar.dto';
import { UpdateAppearanceSettingsDto } from './dto/appearance-settings.dto';

@Controller('users')
export class UsersController {
    private readonly logger = new Logger(UsersController.name);

    constructor(
        private readonly usersService: UsersService,
        private readonly postsService: PostsService,
        private readonly prisma: PrismaService,
    ) { }

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
        this.logger.log(`Leaderboard endpoint hit with period: ${period}, limit: ${limit}`);
        const limitNum = limit ? parseInt(limit) : 50;
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
            where: dateFilter ? {
                createdAt: { gte: dateFilter },
            } : undefined,
            select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
                level: true,
                points: true,
            },
            orderBy: [
                { points: 'desc' },
                { level: 'desc' },
            ],
            take: limitNum,
        });

        this.logger.log(`Found ${users.length} users for leaderboard`);
        return { users };
    }

    @Get('search')
    async search(@Query('q') query: string) {
        this.logger.log(`Search endpoint hit with query: ${query}`);
        if (!query) return [];
        return this.usersService.searchUsers(query);
    }

    @UseGuards(JwtAuthGuard)
    @Patch('profile')
    async updateProfile(@Request() req: any, @Body() updateData: UpdateProfileDto) {
        this.logger.log(`Updating profile for user ID: ${req.user.id}`);
        return this.usersService.updateProfile(req.user.id, updateData);
    }

    @UseGuards(JwtAuthGuard)
    @Post('avatar/ready-player-me')
    async saveReadyPlayerAvatar(@Request() req: any, @Body() dto: SaveReadyPlayerAvatarDto) {
        return this.usersService.saveReadyPlayerAvatar(req.user.id, dto.avatarUrl);
    }

    @UseGuards(JwtAuthGuard)
    @Get('appearance-settings')
    async getAppearanceSettings(@Request() req: any) {
        return this.usersService.getAppearanceSettings(req.user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Put('appearance-settings')
    async updateAppearanceSettings(@Request() req: any, @Body() dto: UpdateAppearanceSettingsDto) {
        return this.usersService.updateAppearanceSettings(req.user.id, dto);
    }

    @UseGuards(JwtAuthGuard)
    @Get('privacy')
    async getPrivacySettings(@Request() req: any) {
        return this.usersService.getPrivacySettings(req.user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Patch('privacy')
    async updatePrivacySettings(@Request() req: any, @Body() updateData: { privacySettings: any }) {
        return this.usersService.updatePrivacySettings(req.user.id, updateData.privacySettings);
    }

    @UseGuards(JwtAuthGuard)
    @Get('notification-settings')
    async getNotificationSettings(@Request() req: any) {
        return this.usersService.getNotificationSettings(req.user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Patch('notification-settings')
    async updateNotificationSettings(@Request() req: any, @Body() updateData: { notificationSettings: any }) {
        return this.usersService.updateNotificationSettings(req.user.id, updateData.notificationSettings);
    }

    @UseGuards(JwtAuthGuard)
    @Get('blocked')
    async getBlockedUsers(@Request() req: any) {
        return this.usersService.getBlockedUsers(req.user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Post('block/:userId')
    async blockUser(@Request() req: any, @Param('userId') userId: string) {
        return this.usersService.blockUser(req.user.id, userId);
    }

    @UseGuards(JwtAuthGuard)
    @Delete('unblock/:userId')
    async unblockUser(@Request() req: any, @Param('userId') userId: string) {
        return this.usersService.unblockUser(req.user.id, userId);
    }

    @UseGuards(JwtAuthGuard)
    @Get('security-stats')
    async getSecurityStats(@Request() req: any) {
        return this.usersService.getSecurityStats(req.user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Get('ai-usage')
    async getAiUsage(@Request() req: any) {
        return this.usersService.getAiUsage(req.user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Get('dashboard')
    async getDashboard(@Request() req: any, @Query('period') period?: string) {
        return this.usersService.getDashboard(req.user.id, period);
    }

    @UseGuards(JwtAuthGuard)
    @Post('export-data')
    async exportData(@Request() req: any) {
        return this.usersService.exportUserData(req.user.id);
    }

    @Get(':username')
    async getProfileByUsername(@Param('username') username: string) {
        return this.usersService.findByUsername(username);
    }

    @Get(':username/posts')
    @UseGuards(OptionalJwtAuthGuard)
    async getPostsByUsername(
        @Param('username') username: string,
        @Request() req: any,
    ) {
        this.logger.log(`Fetching posts for user: ${username}`);
        
        if (req.user && req.user.username?.toLowerCase() === username.toLowerCase()) {
            this.logger.log(`✓ Using authenticated user ID: ${req.user.id}`);
            return this.postsService.findAllByUser(req.user.id);
        }
        
        const user = await this.usersService.findByUsername(username);
        if (!user) {
            throw new NotFoundException(`User @${username} not found`);
        }
        this.logger.log(`✓ Found user ID: ${user.id} for username: ${username}`);
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
        const pageNum = page ? parseInt(page) : 1;
        const limitNum = limit ? parseInt(limit) : 20;
        const skip = (pageNum - 1) * limitNum;

        let userId: string;
        if (req?.user && req.user.username?.toLowerCase() === username.toLowerCase()) {
            userId = req.user.id;
        } else {
            const user = await this.usersService.findByUsername(username);
            userId = user.id;
        }

        const activities = await this.prisma.activity.findMany({
            where: { userId: userId },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limitNum,
        });

        return {
            success: true,
            data: activities,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: await this.prisma.activity.count({ where: { userId: userId } }),
            },
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
        const pageNum = page ? parseInt(page) : 1;
        const limitNum = limit ? parseInt(limit) : 20;
        const skip = (pageNum - 1) * limitNum;

        let userId: string;
        if (req?.user && req.user.username?.toLowerCase() === username.toLowerCase()) {
            userId = req.user.id;
        } else {
            const user = await this.usersService.findByUsername(username);
            userId = user.id;
        }

        const likes = await this.prisma.like.findMany({
            where: {
                userId: userId,
                targetType: 'POST',
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limitNum,
        });

        const postIds = likes.map(like => like.targetId);
        const posts = await this.prisma.post.findMany({
            where: { id: { in: postIds } },
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
                _count: {
                    select: {
                        comments: true,
                    },
                },
            },
        });

        const likeCounts = await this.prisma.like.groupBy({
            by: ['targetId'],
            where: {
                targetId: { in: postIds },
                targetType: 'POST',
            },
            _count: true,
        });
        const likeCountMap = new Map(likeCounts.map(lc => [lc.targetId, lc._count]));

        let userLikes: string[] = [];
        if (req?.user?.id) {
            const currentUserLikes = await this.prisma.like.findMany({
                where: {
                    userId: req.user.id,
                    targetId: { in: postIds },
                    targetType: 'POST',
                },
                select: { targetId: true },
            });
            userLikes = currentUserLikes.map(like => like.targetId);
        }

        const postsWithLikeStatus = posts.map(post => ({
            ...post,
            isLiked: userLikes.includes(post.id),
            likesCount: likeCountMap.get(post.id) || 0,
            commentsCount: post._count.comments,
        }));

        return postsWithLikeStatus;
    }

    @UseGuards(OptionalJwtAuthGuard)
    @Get(':username/commented-posts')
    async getCommentedPosts(
        @Param('username') username: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Request() req?: any,
    ) {
        const pageNum = page ? parseInt(page) : 1;
        const limitNum = limit ? parseInt(limit) : 20;
        const skip = (pageNum - 1) * limitNum;

        let userId: string;
        if (req?.user && req.user.username?.toLowerCase() === username.toLowerCase()) {
            userId = req.user.id;
        } else {
            const user = await this.usersService.findByUsername(username);
            userId = user.id;
        }

        const comments = await this.prisma.comment.findMany({
            where: { authorId: userId },
            orderBy: { createdAt: 'desc' },
            distinct: ['postId'],
            skip,
            take: limitNum,
            select: {
                postId: true,
                createdAt: true,
            },
        });

        const postIds = comments.map(comment => comment.postId);
        const posts = await this.prisma.post.findMany({
            where: { id: { in: postIds } },
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
                _count: {
                    select: {
                        comments: true,
                    },
                },
            },
        });

        const likeCounts = await this.prisma.like.groupBy({
            by: ['targetId'],
            where: {
                targetId: { in: postIds },
                targetType: 'POST',
            },
            _count: true,
        });
        const likeCountMap = new Map(likeCounts.map(lc => [lc.targetId, lc._count]));

        let userLikes: string[] = [];
        if (req?.user?.id) {
            const currentUserLikes = await this.prisma.like.findMany({
                where: {
                    userId: req.user.id,
                    targetId: { in: postIds },
                    targetType: 'POST',
                },
                select: { targetId: true },
            });
            userLikes = currentUserLikes.map(like => like.targetId);
        }

        const postsWithLikeStatus = posts.map(post => ({
            ...post,
            isLiked: userLikes.includes(post.id),
            likesCount: likeCountMap.get(post.id) || 0,
            commentsCount: post._count.comments,
        }));

        return postsWithLikeStatus;
    }

    @UseGuards(OptionalJwtAuthGuard)
    @Get(':username/stats')
    async getUserStats(
        @Param('username') username: string,
        @Request() req?: any,
    ) {
        let userId: string;
        if (req?.user && req.user.username?.toLowerCase() === username.toLowerCase()) {
            userId = req.user.id;
        } else {
            const user = await this.usersService.findByUsername(username);
            userId = user.id;
        }

        const [postsCount, commentsCount, likesGiven, likesReceived] = await Promise.all([
            this.prisma.post.count({ where: { authorId: userId } }),
            this.prisma.comment.count({ where: { authorId: userId } }),
            this.prisma.like.count({ where: { userId: userId } }),
            this.prisma.like.count({
                where: {
                    targetType: 'POST',
                    targetId: {
                        in: (await this.prisma.post.findMany({
                            where: { authorId: userId },
                            select: { id: true },
                        })).map(p => p.id),
                    },
                },
            }),
        ]);

        return {
            success: true,
            data: {
                postsCount,
                commentsCount,
                likesGiven,
                likesReceived,
            },
        };
    }

    @UseGuards(OptionalJwtAuthGuard)
    @Get(':username/activity-heatmap')
    async getActivityHeatmap(
        @Param('username') username: string,
        @Request() req?: any,
    ) {
        let userId: string;
        if (req?.user && req.user.username?.toLowerCase() === username.toLowerCase()) {
            userId = req.user.id;
        } else {
            const user = await this.usersService.findByUsername(username);
            userId = user.id;
        }

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 84);

        const [posts, comments, likes] = await Promise.all([
            this.prisma.post.findMany({
                where: {
                    authorId: userId,
                    createdAt: { gte: startDate },
                },
                select: { createdAt: true },
            }),
            this.prisma.comment.findMany({
                where: {
                    authorId: userId,
                    createdAt: { gte: startDate },
                },
                select: { createdAt: true },
            }),
            this.prisma.like.findMany({
                where: {
                    userId: userId,
                    createdAt: { gte: startDate },
                },
                select: { createdAt: true },
            }),
        ]);

        const activityMap = new Map<string, number>();

        [...posts, ...comments, ...likes].forEach(item => {
            const date = item.createdAt.toISOString().split('T')[0];
            activityMap.set(date, (activityMap.get(date) || 0) + 1);
        });

        const activities = Array.from(activityMap.entries()).map(([date, count]) => ({
            date,
            count,
        }));

        return activities;
    }

    @UseGuards(JwtAuthGuard)
    @Post(':username/pin-post')
    async pinPost(
        @Param('username') username: string,
        @Body('postId') postId: string,
        @Request() req: any,
    ) {
        if (req.user.username?.toLowerCase() !== username.toLowerCase()) {
            return { success: false, message: 'Unauthorized' };
        }

        const user = await this.prisma.user.findUnique({
            where: { id: req.user.id },
            select: { pinnedPosts: true },
        });

        if (!user) {
            return { success: false, message: 'User not found' };
        }

        if (user.pinnedPosts.includes(postId)) {
            return { success: false, message: 'Post already pinned' };
        }

        if (user.pinnedPosts.length >= 3) {
            return { success: false, message: 'Maximum 3 posts can be pinned' };
        }

        const post = await this.prisma.post.findFirst({
            where: { id: postId, authorId: req.user.id },
        });

        if (!post) {
            return { success: false, message: 'Post not found or unauthorized' };
        }

        await this.prisma.user.update({
            where: { id: req.user.id },
            data: {
                pinnedPosts: [...user.pinnedPosts, postId],
            },
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
            return { success: false, message: 'Unauthorized' };
        }

        const user = await this.prisma.user.findUnique({
            where: { id: req.user.id },
            select: { pinnedPosts: true },
        });

        if (!user) {
            return { success: false, message: 'User not found' };
        }

        await this.prisma.user.update({
            where: { id: req.user.id },
            data: {
                pinnedPosts: user.pinnedPosts.filter(id => id !== postId),
            },
        });

        return { success: true, message: 'Post unpinned successfully' };
    }

    @UseGuards(OptionalJwtAuthGuard)
    @Get(':username/pinned-posts')
    async getPinnedPosts(
        @Param('username') username: string,
        @Request() req?: any,
    ) {
        let userId: string;
        if (req?.user && req.user.username?.toLowerCase() === username.toLowerCase()) {
            userId = req.user.id;
        } else {
            const user = await this.usersService.findByUsername(username);
            userId = user.id;
        }

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { pinnedPosts: true },
        });

        if (!user || user.pinnedPosts.length === 0) {
            return [];
        }

        const posts = await this.prisma.post.findMany({
            where: { id: { in: user.pinnedPosts } },
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
                _count: {
                    select: {
                        comments: true,
                    },
                },
            },
        });

        const likeCounts = await this.prisma.like.groupBy({
            by: ['targetId'],
            where: {
                targetId: { in: user.pinnedPosts },
                targetType: 'POST',
            },
            _count: true,
        });
        const likeCountMap = new Map(likeCounts.map(lc => [lc.targetId, lc._count]));

        let userLikes: string[] = [];
        if (req?.user?.id) {
            const currentUserLikes = await this.prisma.like.findMany({
                where: {
                    userId: req.user.id,
                    targetId: { in: user.pinnedPosts },
                    targetType: 'POST',
                },
                select: { targetId: true },
            });
            userLikes = currentUserLikes.map(like => like.targetId);
        }

        const orderedPosts = user.pinnedPosts
            .map(pinnedId => posts.find(p => p.id === pinnedId))
            .filter((post): post is NonNullable<typeof post> => post !== undefined)
            .map(post => ({
                ...post,
                isLiked: userLikes.includes(post.id),
                likesCount: likeCountMap.get(post.id) || 0,
                commentsCount: post._count.comments,
                isPinned: true,
            }));

        return orderedPosts;
    }
}
