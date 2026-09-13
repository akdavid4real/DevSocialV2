import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

type SearchType = 'all' | 'posts' | 'users' | 'tags';

type SearchParams = {
    query: string;
    type: string;
    page: number;
    limit: number;
};

@Injectable()
export class SearchService {
    constructor(private readonly prisma: PrismaService) {}

    async search(params: SearchParams) {
        const query = params.query?.trim();
        if (!query) {
            throw new BadRequestException('Search query is required');
        }

        const type = this.normalizeType(params.type);
        const page = Number.isFinite(params.page) && params.page > 0 ? params.page : 1;
        const limit = Number.isFinite(params.limit) && params.limit > 0 ? Math.min(params.limit, 50) : 20;
        const skip = (page - 1) * limit;

        const [posts, users, tags] = await Promise.all([
            type === 'all' || type === 'posts'
                ? this.searchPosts(query, type === 'posts' ? skip : 0, type === 'posts' ? limit : 10)
                : Promise.resolve([]),
            type === 'all' || type === 'users'
                ? this.searchUsers(query, type === 'users' ? skip : 0, type === 'users' ? limit : 10)
                : Promise.resolve([]),
            type === 'all' || type === 'tags'
                ? this.searchTags(query, type === 'tags' ? skip : 0, type === 'tags' ? limit : 10)
                : Promise.resolve([]),
        ]);

        const totals = await this.getTotals(query, type, { posts, users, tags });
        const totalResults = type === 'all'
            ? totals.posts + totals.users + totals.tags
            : totals[type];

        return {
            success: true,
            data: {
                results: {
                    posts,
                    users,
                    tags,
                },
                query,
                type,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalResults / limit),
                    totalResults,
                    hasMore: skip + this.currentResultLength(type, { posts, users, tags }) < totalResults,
                },
            },
        };
    }

    private normalizeType(type: string): SearchType {
        if (type === 'posts' || type === 'users' || type === 'tags' || type === 'all') {
            return type;
        }
        return 'all';
    }

    private async searchPosts(query: string, skip: number, limit: number) {
        const posts = await this.prisma.post.findMany({
            where: {
                status: 'ACTIVE',
                OR: [
                    { content: { contains: query, mode: 'insensitive' } },
                    { author: { username: { contains: query, mode: 'insensitive' } } },
                    { author: { displayName: { contains: query, mode: 'insensitive' } } },
                    { tags: { some: { tag: { name: { contains: query.replace(/^#/, ''), mode: 'insensitive' } } } } },
                ],
            },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatar: true,
                        level: true,
                        role: true,
                    },
                },
                tags: {
                    include: {
                        tag: true,
                    },
                },
                _count: {
                    select: {
                        comments: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        });

        const postIds = posts.map((post) => post.id);
        const likeCounts = postIds.length > 0
            ? await this.prisma.like.groupBy({
                by: ['targetId'],
                where: {
                    targetId: { in: postIds },
                    targetType: 'POST',
                },
                _count: true,
            })
            : [];
        const likeCountMap = new Map(likeCounts.map((likeCount) => [likeCount.targetId, likeCount._count]));

        return posts.map((post) => ({
            ...post,
            likesCount: likeCountMap.get(post.id) || 0,
            commentsCount: post._count.comments,
            viewsCount: post.viewsCount || 0,
        }));
    }

    private searchUsers(query: string, skip: number, limit: number) {
        return this.prisma.user.findMany({
            where: {
                OR: [
                    { username: { contains: query, mode: 'insensitive' } },
                    { displayName: { contains: query, mode: 'insensitive' } },
                    { bio: { contains: query, mode: 'insensitive' } },
                    { techStack: { has: query } },
                    { interests: { has: query } },
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
                techStack: true,
                interests: true,
            },
            orderBy: [
                { points: 'desc' },
                { createdAt: 'desc' },
            ],
            skip,
            take: limit,
        });
    }

    private searchTags(query: string, skip: number, limit: number) {
        const normalizedQuery = query.replace(/^#/, '').trim();

        return this.prisma.tag.findMany({
            where: {
                OR: [
                    { name: { contains: normalizedQuery, mode: 'insensitive' } },
                    { slug: { contains: normalizedQuery.toLowerCase(), mode: 'insensitive' } },
                    { description: { contains: normalizedQuery, mode: 'insensitive' } },
                ],
            },
            select: {
                id: true,
                name: true,
                slug: true,
                description: true,
                color: true,
                usageCount: true,
                _count: {
                    select: {
                        posts: true,
                    },
                },
            },
            orderBy: [
                { usageCount: 'desc' },
                { name: 'asc' },
            ],
            skip,
            take: limit,
        }).then((tags) => tags.map((tag) => ({
            id: tag.id,
            tag: tag.name,
            name: tag.name,
            slug: tag.slug,
            description: tag.description,
            color: tag.color,
            count: tag._count.posts,
            posts: tag._count.posts,
            usageCount: tag.usageCount,
        })));
    }

    private async getTotals(
        query: string,
        type: SearchType,
        currentResults: { posts: unknown[]; users: unknown[]; tags: unknown[] },
    ) {
        if (type === 'all') {
            return {
                posts: currentResults.posts.length,
                users: currentResults.users.length,
                tags: currentResults.tags.length,
            };
        }

        const normalizedTagQuery = query.replace(/^#/, '').trim();
        const [posts, users, tags] = await Promise.all([
            type === 'posts'
                ? this.prisma.post.count({
                    where: {
                        status: 'ACTIVE',
                        OR: [
                            { content: { contains: query, mode: 'insensitive' } },
                            { author: { username: { contains: query, mode: 'insensitive' } } },
                            { author: { displayName: { contains: query, mode: 'insensitive' } } },
                            { tags: { some: { tag: { name: { contains: normalizedTagQuery, mode: 'insensitive' } } } } },
                        ],
                    },
                })
                : Promise.resolve(currentResults.posts.length),
            type === 'users'
                ? this.prisma.user.count({
                    where: {
                        OR: [
                            { username: { contains: query, mode: 'insensitive' } },
                            { displayName: { contains: query, mode: 'insensitive' } },
                            { bio: { contains: query, mode: 'insensitive' } },
                            { techStack: { has: query } },
                            { interests: { has: query } },
                        ],
                    },
                })
                : Promise.resolve(currentResults.users.length),
            type === 'tags'
                ? this.prisma.tag.count({
                    where: {
                        OR: [
                            { name: { contains: normalizedTagQuery, mode: 'insensitive' } },
                            { slug: { contains: normalizedTagQuery.toLowerCase(), mode: 'insensitive' } },
                            { description: { contains: normalizedTagQuery, mode: 'insensitive' } },
                        ],
                    },
                })
                : Promise.resolve(currentResults.tags.length),
        ]);

        return { posts, users, tags };
    }

    private currentResultLength(
        type: SearchType,
        results: { posts: unknown[]; users: unknown[]; tags: unknown[] },
    ) {
        if (type === 'all') {
            return results.posts.length + results.users.length + results.tags.length;
        }
        return results[type].length;
    }
}
