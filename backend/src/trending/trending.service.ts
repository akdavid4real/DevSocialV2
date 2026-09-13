import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class TrendingService {
    private readonly logger = new Logger(TrendingService.name);

    constructor(private prisma: PrismaService) {}

    async getTrendingData(period: string) {
        this.logger.log(`Fetching trending data for period: ${period}`);

        const dateFilter = this.getDateFilter(period);

        const [trendingPosts, trendingTopics, risingUsers] = await Promise.all([
            this.getTrendingPosts(dateFilter),
            this.getTrendingTopics(dateFilter),
            this.getRisingUsers(dateFilter),
        ]);

        const stats = this.calculateStats(trendingPosts);

        return {
            trendingPosts,
            trendingTopics,
            risingUsers,
            stats,
        };
    }

    private getDateFilter(period: string): Date {
        const date = new Date();
        switch (period) {
            case 'today':
                date.setHours(0, 0, 0, 0);
                break;
            case 'week':
                date.setDate(date.getDate() - 7);
                break;
            case 'month':
                date.setMonth(date.getMonth() - 1);
                break;
            default:
                date.setHours(0, 0, 0, 0);
        }
        this.logger.log(`Date filter for ${period}: ${date.toISOString()}`);
        return date;
    }

    private async getTrendingPosts(dateFilter: Date) {
        this.logger.log(`Fetching posts created after: ${dateFilter.toISOString()}`);
        
        const posts = await this.prisma.post.findMany({
            where: {
                createdAt: { gte: dateFilter },
                status: 'ACTIVE',
            },
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
            orderBy: { createdAt: 'desc' },
        });

        this.logger.log(`Found ${posts.length} posts for trending`);

        const postIds = posts.map(p => p.id);
        const likeCounts = await this.prisma.like.groupBy({
            by: ['targetId'],
            where: {
                targetId: { in: postIds },
                targetType: 'POST',
            },
            _count: true,
        });

        const likeCountMap = new Map(likeCounts.map(lc => [lc.targetId, lc._count]));

        const postsWithScores = posts.map(post => {
            const likesCount = likeCountMap.get(post.id) || 0;
            const commentsCount = post._count.comments;
            const trendingScore = likesCount * 2 + commentsCount * 3;

            return {
                ...post,
                likesCount,
                commentsCount,
                viewsCount: post.viewsCount || 0,
                trendingScore,
            };
        });

        return postsWithScores
            .sort((a, b) => b.trendingScore - a.trendingScore)
            .slice(0, 20);
    }

    private async getTrendingTopics(dateFilter: Date) {
        const posts = await this.prisma.post.findMany({
            where: {
                createdAt: { gte: dateFilter },
                status: 'ACTIVE',
            },
            select: {
                id: true,
                content: true,
            },
        });

        const tagCounts = new Map<string, number>();
        const hashtagRegex = /#(\w+)/g;

        posts.forEach(post => {
            const matches = post.content.matchAll(hashtagRegex);
            for (const match of matches) {
                const tag = match[1].toLowerCase();
                tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
            }
        });

        const topics = Array.from(tagCounts.entries())
            .map(([tag, posts]) => ({
                tag,
                posts,
                growth: '+100%',
            }))
            .sort((a, b) => b.posts - a.posts)
            .slice(0, 10);

        return topics;
    }

    private async getRisingUsers(dateFilter: Date) {
        const users = await this.prisma.user.findMany({
            where: {
                updatedAt: { gte: dateFilter },
            },
            select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
                level: true,
                points: true,
            },
            orderBy: {
                points: 'desc',
            },
            take: 10,
        });

        const usersWithStats = await Promise.all(
            users.map(async (user) => {
                const postsCount = await this.prisma.post.count({
                    where: {
                        authorId: user.id,
                        createdAt: { gte: dateFilter },
                    },
                });

                return {
                    ...user,
                    postsCount,
                };
            })
        );

        return usersWithStats;
    }

    private calculateStats(posts: any[]) {
        const hotPosts = posts.length;
        const totalViews = posts.reduce((sum, post) => sum + (post.viewsCount || 0), 0);
        const totalEngagements = posts.reduce(
            (sum, post) => sum + (post.likesCount || 0) + (post.commentsCount || 0),
            0
        );

        const formatNumber = (num: number) => {
            if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
            if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
            return num.toString();
        };

        return {
            hotPosts,
            growth: '+25%',
            totalViews: formatNumber(totalViews),
            engagements: formatNumber(totalEngagements),
        };
    }
}
