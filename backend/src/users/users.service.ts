import { BadRequestException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { UpdateAppearanceSettingsDto } from './dto/appearance-settings.dto';

@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name);

    constructor(private prisma: PrismaService) { }

    private getDefaultAppearanceSettings() {
        return {
            theme: 'system',
            fontSize: 'medium',
            compactMode: false,
            highContrast: false,
            reducedMotion: false,
            colorTheme: 'vibrant',
            sidebarCollapsed: false,
            showAvatars: true,
        };
    }

    async findByUsername(username: string) {
        this.logger.log(`Fetching profile for @${username}`);
        const user = await this.prisma.user.findFirst({
            where: {
                username: {
                    equals: username,
                    mode: 'insensitive',
                },
            },
            select: {
                id: true,
                username: true,
                displayName: true,
                bio: true,
                avatar: true,
                bannerUrl: true,
                affiliation: true,
                techStack: true,
                interests: true,
                experienceLevel: true,
                points: true,
                level: true,
                badges: true,
                location: true,
                website: true,
                githubUsername: true,
                linkedinUrl: true,
                createdAt: true,
                followersCount: true,
                followingCount: true,
            },
        });

        if (!user) {
            throw new NotFoundException(`User @${username} not found`);
        }

        return user;
    }

    async updateProfile(userId: string, data: any) {
        this.logger.log(`Updating profile for User ID: ${userId}`);
        return this.prisma.user.update({
            where: { id: userId },
            data: {
                displayName: data.displayName,
                bio: data.bio,
                avatar: data.avatar,
                bannerUrl: data.bannerUrl,
                location: data.location,
                website: data.website,
                githubUsername: data.githubUsername,
                linkedinUrl: data.linkedinUrl,
                portfolioUrl: data.portfolioUrl,
                affiliation: data.affiliation,
                techStack: data.techStack,
                techCareerPath: data.techCareerPath,
                experienceLevel: data.experienceLevel,
                interests: data.interests,
            },
        });
    }

    async saveReadyPlayerAvatar(userId: string, avatarUrl: string) {
        const normalizedAvatar = this.normalizeReadyPlayerAvatarUrl(avatarUrl);

        const user = await this.prisma.user.update({
            where: { id: userId },
            data: { avatar: normalizedAvatar },
            select: {
                id: true,
                avatar: true,
            },
        });

        return {
            success: true,
            message: 'Avatar saved successfully',
            data: {
                avatarUrl: user.avatar,
            },
        };
    }

    async getAppearanceSettings(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                appearanceSettings: true,
            },
        });

        const savedSettings = user?.appearanceSettings && typeof user.appearanceSettings === 'object' && !Array.isArray(user.appearanceSettings)
            ? user.appearanceSettings as Record<string, unknown>
            : {};

        return {
            data: {
                appearanceSettings: {
                    ...this.getDefaultAppearanceSettings(),
                    ...savedSettings,
                },
            },
        };
    }

    async updateAppearanceSettings(userId: string, appearanceSettings: UpdateAppearanceSettingsDto) {
        const nextSettings = {
            ...this.getDefaultAppearanceSettings(),
            ...appearanceSettings,
        };

        const user = await this.prisma.user.update({
            where: { id: userId },
            data: { appearanceSettings: nextSettings },
            select: { appearanceSettings: true },
        });

        return {
            success: true,
            message: 'Appearance settings updated successfully',
            data: {
                appearanceSettings: user.appearanceSettings,
            },
        };
    }

    async getPrivacySettings(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                privacySettings: true,
            },
        });

        return {
            data: {
                privacySettings: user?.privacySettings || {},
            },
        };
    }

    async updatePrivacySettings(userId: string, privacySettings: any) {
        await this.prisma.user.update({
            where: { id: userId },
            data: { privacySettings },
        });

        return {
            success: true,
            message: 'Privacy settings updated successfully',
        };
    }

    async getNotificationSettings(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                notificationSettings: true,
            },
        });

        return {
            data: {
                notificationSettings: user?.notificationSettings || {},
            },
        };
    }

    async updateNotificationSettings(userId: string, notificationSettings: any) {
        await this.prisma.user.update({
            where: { id: userId },
            data: { notificationSettings },
        });

        return {
            success: true,
            message: 'Notification settings updated successfully',
        };
    }

    async getBlockedUsers(userId: string) {
        const blocks = await this.prisma.block.findMany({
            where: { blockerId: userId },
            select: {
                blockedId: true,
                createdAt: true,
            },
        });

        const blockedUserIds = blocks.map((b) => b.blockedId);

        const users = await this.prisma.user.findMany({
            where: { id: { in: blockedUserIds } },
            select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
            },
        });

        const blocksMap = new Map(blocks.map((b) => [b.blockedId, b.createdAt]));

        const blockedUsers = users.map((user) => ({
            ...user,
            blockedAt: blocksMap.get(user.id),
        }));

        return { data: blockedUsers };
    }

    async blockUser(userId: string, blockedId: string) {
        if (userId === blockedId) {
            throw new BadRequestException('Cannot block yourself');
        }

        const targetUser = await this.prisma.user.findUnique({
            where: { id: blockedId },
            select: { id: true, username: true },
        });

        if (!targetUser) {
            throw new NotFoundException('User not found');
        }

        const existingFollows = await this.prisma.follow.findMany({
            where: {
                OR: [
                    { followerId: userId, followingId: blockedId },
                    { followerId: blockedId, followingId: userId },
                ],
            },
            select: {
                followerId: true,
                followingId: true,
            },
        });

        const currentUserFollowsTarget = existingFollows.some(
            (follow) => follow.followerId === userId && follow.followingId === blockedId,
        );
        const targetFollowsCurrentUser = existingFollows.some(
            (follow) => follow.followerId === blockedId && follow.followingId === userId,
        );

        const countUpdates = [];

        if (currentUserFollowsTarget) {
            countUpdates.push(
                this.prisma.user.updateMany({
                    where: { id: userId, followingCount: { gt: 0 } },
                    data: { followingCount: { decrement: 1 } },
                }),
                this.prisma.user.updateMany({
                    where: { id: blockedId, followersCount: { gt: 0 } },
                    data: { followersCount: { decrement: 1 } },
                }),
            );
        }

        if (targetFollowsCurrentUser) {
            countUpdates.push(
                this.prisma.user.updateMany({
                    where: { id: blockedId, followingCount: { gt: 0 } },
                    data: { followingCount: { decrement: 1 } },
                }),
                this.prisma.user.updateMany({
                    where: { id: userId, followersCount: { gt: 0 } },
                    data: { followersCount: { decrement: 1 } },
                }),
            );
        }

        await this.prisma.$transaction([
            this.prisma.block.upsert({
                where: {
                    blockerId_blockedId: {
                        blockerId: userId,
                        blockedId,
                    },
                },
                create: {
                    blockerId: userId,
                    blockedId,
                },
                update: {},
            }),
            this.prisma.follow.deleteMany({
                where: {
                    OR: [
                        { followerId: userId, followingId: blockedId },
                        { followerId: blockedId, followingId: userId },
                    ],
                },
            }),
            ...countUpdates,
        ]);

        return {
            success: true,
            message: `Blocked @${targetUser.username}`,
            data: { blockedId },
        };
    }

    async unblockUser(userId: string, blockedId: string) {
        await this.prisma.block.deleteMany({
            where: {
                blockerId: userId,
                blockedId: blockedId,
            },
        });

        return {
            success: true,
            message: 'User unblocked successfully',
        };
    }

    async getSecurityStats(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                createdAt: true,
                lastLogin: true,
            },
        });

        return {
            data: {
                accountCreated: user?.createdAt,
                lastPasswordChange: null, // TODO: Track password changes
                totalLogins: 0, // TODO: Track login count
            },
        };
    }

    async getAiUsage(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                aiUsage: true,
                isPremium: true,
            },
        });

        const rawUsage = user?.aiUsage && typeof user.aiUsage === 'object' && !Array.isArray(user.aiUsage)
            ? user.aiUsage as Record<string, any>
            : {};
        const premium = Boolean(user?.isPremium);

        const buildUsage = (key: string, fallbackLimit: number) => {
            const value = rawUsage[key];
            const used = typeof value?.used === 'number' ? value.used : 0;
            const limit = typeof value?.limit === 'number' ? value.limit : fallbackLimit;
            return {
                used,
                limit,
                remaining: Math.max(limit - used, 0),
            };
        };

        return {
            data: {
                summaries: buildUsage('summaries', premium ? 100 : 5),
                explanations: buildUsage('explanations', premium ? 100 : 10),
                enhancements: buildUsage('enhancements', premium ? 100 : 5),
                transcriptions: buildUsage('transcriptions', premium ? 100 : 10),
                imageAnalysis: buildUsage('imageAnalysis', premium ? 100 : 10),
                isPremium: premium,
                resetsOn: typeof rawUsage.resetsOn === 'string' ? rawUsage.resetsOn : null,
            },
        };
    }

    async getDashboard(userId: string, period = 'week') {
        const now = new Date();
        const startDate = new Date(now);
        if (period === 'year') startDate.setFullYear(now.getFullYear() - 1);
        else if (period === 'month') startDate.setMonth(now.getMonth() - 1);
        else startDate.setDate(now.getDate() - 7);

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
                points: true,
                level: true,
                badges: true,
                createdAt: true,
                loginStreak: true,
                followersCount: true,
                followingCount: true,
            },
        });

        const [
            periodPosts,
            lifetimePosts,
            ownedPostIds,
            commentsCount,
            likesGiven,
            completedChallenges,
            unreadNotifications,
            xpBreakdown,
            recentActivities,
            usersWithHigherPoints,
            topPost,
        ] = await Promise.all([
            this.prisma.post.aggregate({
                where: { authorId: userId, createdAt: { gte: startDate } },
                _count: { id: true },
                _sum: { likesCount: true, commentsCount: true, viewsCount: true },
            }),
            this.prisma.post.aggregate({
                where: { authorId: userId },
                _count: { id: true },
                _sum: { likesCount: true, commentsCount: true, viewsCount: true },
            }),
            this.prisma.post.findMany({
                where: { authorId: userId },
                select: { id: true },
            }),
            this.prisma.comment.count({ where: { authorId: userId } }),
            this.prisma.like.count({ where: { userId } }),
            this.prisma.challengeParticipation.count({
                where: { userId, status: 'COMPLETED' },
            }),
            this.prisma.notification.count({
                where: { recipientId: userId, read: false },
            }),
            this.prisma.xpLog.groupBy({
                by: ['type'],
                where: { userId, createdAt: { gte: startDate } },
                _sum: { xpAmount: true },
                _count: { type: true },
            }),
            this.prisma.activity.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: 8,
            }),
            this.prisma.user.count({
                where: { points: { gt: user?.points || 0 } },
            }),
            this.prisma.post.findFirst({
                where: { authorId: userId },
                select: {
                    id: true,
                    content: true,
                    likesCount: true,
                    commentsCount: true,
                    viewsCount: true,
                    createdAt: true,
                },
                orderBy: [
                    { likesCount: 'desc' },
                    { commentsCount: 'desc' },
                    { viewsCount: 'desc' },
                    { createdAt: 'desc' },
                ],
            }),
        ]);

        const likesReceived = ownedPostIds.length > 0
            ? await this.prisma.like.count({
                where: {
                    targetType: 'POST',
                    targetId: { in: ownedPostIds.map((post) => post.id) },
                },
            })
            : 0;

        const dailyActivity = await this.buildDailyActivity(userId, startDate);
        const periodPostCount = periodPosts._count.id || 0;
        const lifetimePostCount = lifetimePosts._count.id || 0;
        const periodLikes = periodPosts._sum.likesCount || 0;
        const periodComments = periodPosts._sum.commentsCount || 0;
        const lifetimeLikes = lifetimePosts._sum.likesCount || 0;
        const lifetimeComments = lifetimePosts._sum.commentsCount || 0;
        const topPostEngagement = topPost
            ? (topPost.likesCount || 0) + (topPost.commentsCount || 0) + (topPost.viewsCount || 0)
            : 0;

        return {
            data: {
                user: user ? { ...user, rank: usersWithHigherPoints + 1 } : null,
                stats: {
                    posts: {
                        totalPosts: periodPostCount,
                        totalLikes: periodLikes,
                        totalComments: periodComments,
                        totalViews: periodPosts._sum.viewsCount || 0,
                        avgLikes: periodPostCount > 0 ? periodLikes / periodPostCount : 0,
                        avgComments: periodPostCount > 0 ? periodComments / periodPostCount : 0,
                        lifetimePosts: lifetimePostCount,
                        lifetimeLikes,
                        lifetimeComments,
                        lifetimeViews: lifetimePosts._sum.viewsCount || 0,
                        lifetimeAvgEngagement: lifetimePostCount > 0 ? (lifetimeLikes + lifetimeComments) / lifetimePostCount : 0,
                    },
                    engagement: {
                        commentsCount,
                        likesGiven,
                        likesReceived,
                        followersCount: user?.followersCount || 0,
                        followingCount: user?.followingCount || 0,
                        topPost: topPost ? {
                            id: topPost.id,
                            content: topPost.content,
                            likesCount: topPost.likesCount || 0,
                            commentsCount: topPost.commentsCount || 0,
                            viewsCount: topPost.viewsCount || 0,
                            engagement: topPostEngagement,
                        } : null,
                    },
                    xp: {
                        total: user?.points || 0,
                        breakdown: xpBreakdown.map((item) => ({
                            type: item.type,
                            totalXP: item._sum.xpAmount || 0,
                            count: item._count.type,
                        })),
                    },
                    challenges: {
                        completed: completedChallenges,
                    },
                    notifications: {
                        unreadCount: unreadNotifications,
                    },
                },
                charts: {
                    period,
                    dailyActivity,
                },
                recentActivities,
            },
        };
    }

    async exportUserData(userId: string) {
        const [
            user,
            posts,
            comments,
            projects,
            knowledgeEntries,
            feedback,
            referrals,
            xpLogs,
            activities,
            notifications,
            blockedUsers,
        ] = await Promise.all([
            this.prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    email: true,
                    username: true,
                    firstName: true,
                    lastName: true,
                    displayName: true,
                    bio: true,
                    avatar: true,
                    bannerUrl: true,
                    role: true,
                    affiliation: true,
                    techCareerPath: true,
                    techStack: true,
                    experienceLevel: true,
                    githubUsername: true,
                    linkedinUrl: true,
                    portfolioUrl: true,
                    points: true,
                    level: true,
                    badges: true,
                    loginStreak: true,
                    followersCount: true,
                    followingCount: true,
                    isVerified: true,
                    onboardingCompleted: true,
                    location: true,
                    website: true,
                    country: true,
                    appearanceSettings: true,
                    privacySettings: true,
                    notificationSettings: true,
                    aiUsage: true,
                    createdAt: true,
                    updatedAt: true,
                },
            }),
            this.prisma.post.findMany({
                where: { authorId: userId },
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    content: true,
                    imageUrls: true,
                    videoUrls: true,
                    isAnonymous: true,
                    poll: true,
                    likesCount: true,
                    commentsCount: true,
                    viewsCount: true,
                    status: true,
                    createdAt: true,
                    updatedAt: true,
                },
            }),
            this.prisma.comment.findMany({
                where: { authorId: userId },
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    postId: true,
                    parentId: true,
                    content: true,
                    imageUrls: true,
                    videoUrls: true,
                    likesCount: true,
                    createdAt: true,
                    updatedAt: true,
                },
            }),
            this.prisma.project.findMany({
                where: { authorId: userId },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.knowledgeEntry.findMany({
                where: { authorId: userId },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.feedback.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.referral.findMany({
                where: {
                    OR: [{ referrerId: userId }, { referredId: userId }],
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.xpLog.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.activity.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.notification.findMany({
                where: { recipientId: userId },
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    type: true,
                    title: true,
                    message: true,
                    relatedId: true,
                    relatedType: true,
                    read: true,
                    actionUrl: true,
                    createdAt: true,
                    updatedAt: true,
                },
            }),
            this.prisma.block.findMany({
                where: { blockerId: userId },
                orderBy: { createdAt: 'desc' },
            }),
        ]);

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return {
            data: {
                exportDate: new Date().toISOString(),
                user,
                content: {
                    posts,
                    comments,
                    projects,
                    knowledgeEntries,
                    feedback,
                },
                accountActivity: {
                    xpLogs,
                    activities,
                    notifications,
                    referrals,
                    blockedUsers,
                },
                statistics: {
                    totalPosts: posts.length,
                    totalComments: comments.length,
                    totalProjects: projects.length,
                    totalKnowledgeEntries: knowledgeEntries.length,
                    totalFeedbackItems: feedback.length,
                    totalNotifications: notifications.length,
                    totalFollowers: user.followersCount,
                    totalFollowing: user.followingCount,
                    accountAgeDays: Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
                },
            },
        };
    }

    private async buildDailyActivity(userId: string, startDate: Date) {
        const [posts, comments, likes] = await Promise.all([
            this.prisma.post.findMany({
                where: { authorId: userId, createdAt: { gte: startDate } },
                select: { createdAt: true },
            }),
            this.prisma.comment.findMany({
                where: { authorId: userId, createdAt: { gte: startDate } },
                select: { createdAt: true },
            }),
            this.prisma.like.findMany({
                where: { userId, createdAt: { gte: startDate } },
                select: { createdAt: true },
            }),
        ]);

        const activityMap = new Map<string, number>();
        [...posts, ...comments, ...likes].forEach((item) => {
            const date = item.createdAt.toISOString().split('T')[0];
            activityMap.set(date, (activityMap.get(date) || 0) + 1);
        });

        return Array.from(activityMap.entries())
            .map(([date, totalActivities]) => ({ date, totalActivities }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }

    async searchUsers(query: string, limit = 20) {
        this.logger.log(`Searching for users with query: ${query}`);
        return this.prisma.user.findMany({
            where: {
                OR: [
                    { username: { contains: query, mode: 'insensitive' } },
                    { displayName: { contains: query, mode: 'insensitive' } },
                    { bio: { contains: query, mode: 'insensitive' } },
                ],
            },
            select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
                level: true,
                points: true,
                bio: true,
            },
            take: limit,
        });
    }

    private normalizeReadyPlayerAvatarUrl(avatarUrl: string) {
        const rawUrl = String(avatarUrl || '').trim().replace(/^['"]+|['"]+$/g, '');

        if (!rawUrl) {
            throw new BadRequestException('avatarUrl required');
        }

        let parsedUrl: URL;
        try {
            parsedUrl = new URL(rawUrl);
        } catch {
            throw new BadRequestException('Invalid avatar URL');
        }

        if (parsedUrl.hostname !== 'models.readyplayer.me') {
            throw new BadRequestException('Invalid avatar URL');
        }

        const pathWithoutQuery = `${parsedUrl.origin}${parsedUrl.pathname}`;
        if (!pathWithoutQuery.toLowerCase().endsWith('.glb') && !pathWithoutQuery.toLowerCase().endsWith('.png')) {
            throw new BadRequestException('Invalid avatar URL');
        }

        return pathWithoutQuery.replace(/\.glb$/i, '.png');
    }
}
