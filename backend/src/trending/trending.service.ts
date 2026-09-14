import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { PostVisibilityService } from '../posts/post-visibility.service';

@Injectable()
export class TrendingService {
    constructor(
        private prisma: PrismaService,
        private visibility: PostVisibilityService,
    ) {}

    async getTrendingData(period: string, viewerId?: string) {
        const dateFilter = this.getDateFilter(period);
        const candidatePosts = await this.getTrendingPosts(dateFilter);
        const visiblePosts = await this.visibility.filterPosts(candidatePosts, viewerId);
        const trendingPosts = visiblePosts.slice(0, 20);

        const [trendingTopics, risingUsers] = await Promise.all([
            this.getTrendingTopics(trendingPosts),
            this.getRisingUsers(dateFilter),
        ]);

        return {
            trendingPosts,
            trendingTopics,
            risingUsers,
            stats: this.calculateStats(trendingPosts),
        };
    }

    private getDateFilter(period: string): Date {
        const date = new Date();
        switch (period) {
            case 'today':
            case 'day':
                date.setHours(0, 0, 0, 0);
                break;
            case 'week':
                date.setDate(date.getDate() - 7);
                break;
            case 'month':
                date.setMonth(date.getMonth() - 1);
                break;
            case 'all':
                date.setFullYear(2000, 0, 1);
                break;
            default:
                date.setDate(date.getDate() - 7);
        }
        return date;
    }

    private async getTrendingPosts(dateFilter: Date) {
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
                _count: { select: { comments: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });

        const postIds = posts.map((post) => post.id);
        const likeCounts = postIds.length
            ? await this.prisma.like.groupBy({
                by: ['targetId'],
                where: { targetId: { in: postIds }, targetType: 'POST' },
                _count: true,
            })
            : [];
        const likeCountMap = new Map(likeCounts.map((item) => [item.targetId, item._count]));

        return posts
            .map((post) => {
                const likesCount = likeCountMap.get(post.id) || 0;
                const commentsCount = post._count.comments;
                return {
                    ...post,
                    likesCount,
                    commentsCount,
                    viewsCount: post.viewsCount || 0,
                    trendingScore: likesCount * 2 + commentsCount * 3,
                };
            })
            .sort((a, b) => b.trendingScore - a.trendingScore);
    }

    private getTrendingTopics(posts: Array<{ content: string }>) {
        const tagCounts = new Map<string, number>();
        const hashtagRegex = /#(\w+)/g;

        posts.forEach((post) => {
            for (const match of post.content.matchAll(hashtagRegex)) {
                const tag = match[1].toLowerCase();
                tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
            }
        });

        return Array.from(tagCounts.entries())
            .map(([tag, count]) => ({ tag, posts: count, growth: '+100%' }))
            .sort((a, b) => b.posts - a.posts)
            .slice(0, 10);
    }

    private async getRisingUsers(dateFilter: Date) {
        const users = await this.prisma.user.findMany({
            where: { updatedAt: { gte: dateFilter }, isBlocked: false },
            select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
                level: true,
                points: true,
                privacySettings: true,
            },
            orderBy: { points: 'desc' },
            take: 30,
        });

        const publicUsers = users.filter((user) => {
            const settings = user.privacySettings && typeof user.privacySettings === 'object' && !Array.isArray(user.privacySettings)
                ? user.privacySettings as Record<string, unknown>
                : {};
            return String(settings.profileVisibility || 'PUBLIC').toUpperCase() !== 'PRIVATE';
        }).slice(0, 10);

        const counts = await Promise.all(
            publicUsers.map((user) => this.prisma.post.count({
                where: { authorId: user.id, createdAt: { gte: dateFilter }, status: 'ACTIVE' },
            })),
        );

        return publicUsers.map(({ privacySettings: _privacySettings, ...user }, index) => ({
            ...user,
            postsCount: counts[index],
        }));
    }

    private calculateStats(posts: any[]) {
        const totalViews = posts.reduce((sum, post) => sum + (post.viewsCount || 0), 0);
        const totalEngagements = posts.reduce(
            (sum, post) => sum + (post.likesCount || 0) + (post.commentsCount || 0),
            0,
        );

        return {
            hotPosts: posts.length,
            totalViews: this.formatNumber(totalViews),
            engagements: this.formatNumber(totalEngagements),
        };
    }

    private formatNumber(num: number) {
        if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
        if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
        return num.toString();
    }
}
