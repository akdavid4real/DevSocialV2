import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { PostsService } from '../posts/posts.service';
import { CreateCommunityDto } from './dto/create-community.dto';
import { CreateCommunityPostDto } from './dto/create-community-post.dto';
import { CommunityAccessService } from './community-access.service';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class CommunitiesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly postsService: PostsService,
        private readonly accessService: CommunityAccessService,
    ) {}

    async findAll(options: { page: number; limit: number; search?: string; category?: string; viewerId?: string }) {
        const page = Math.max(options.page || 1, 1);
        const limit = Math.min(Math.max(options.limit || 12, 1), 50);
        const skip = (page - 1) * limit;
        const category = options.category?.toUpperCase();
        const visibility = options.viewerId
            ? {
                OR: [
                    { isPrivate: false },
                    { members: { some: { userId: options.viewerId } } },
                ],
            }
            : { isPrivate: false };

        const where: any = {
            ...visibility,
            ...(category ? { category } : {}),
            ...(options.search
                ? {
                    AND: [
                        {
                            OR: [
                                { name: { contains: options.search, mode: 'insensitive' } },
                                { description: { contains: options.search, mode: 'insensitive' } },
                            ],
                        },
                    ],
                }
                : {}),
        };

        const [communities, total] = await Promise.all([
            this.prisma.community.findMany({
                where,
                include: {
                    members: options.viewerId
                        ? {
                            where: { userId: options.viewerId },
                            select: { userId: true, role: true },
                        }
                        : false,
                    _count: { select: { members: true } },
                },
                orderBy: [{ memberCount: 'desc' }, { createdAt: 'desc' }],
                skip,
                take: limit,
            }),
            this.prisma.community.count({ where }),
        ]);

        return {
            communities: communities.map((community: any) => ({
                ...community,
                memberCount: community._count?.members ?? community.memberCount,
                isJoined: Boolean(options.viewerId && community.members?.some((member: any) => member.userId === options.viewerId)),
                members: community.members || [],
                memberIds: (community.members || []).map((member: any) => member.userId),
                _count: undefined,
            })),
            total,
            page,
            lastPage: Math.ceil(total / limit),
        };
    }

    async create(userId: string, dto: CreateCommunityDto) {
        const slug = await this.createUniqueSlug(dto.name);
        const community = await this.prisma.community.create({
            data: {
                name: dto.name.trim(),
                slug,
                description: dto.description.trim(),
                category: dto.category as any,
                tags: dto.tags || [],
                rules: (dto.rules || []).filter(Boolean),
                creatorId: userId,
                isPrivate: dto.isPrivate || false,
                memberCount: 1,
                members: {
                    create: {
                        userId,
                        role: 'CREATOR',
                    },
                },
            },
            include: {
                members: {
                    select: { userId: true, role: true },
                },
            },
        });

        return this.serializeCommunity(community);
    }

    async findOne(idOrSlug: string, viewerId?: string) {
        const community = await this.getCommunity(idOrSlug, viewerId);
        const accessState = viewerId
            ? await this.accessService.getRequestState(viewerId, community.id)
            : { requestId: null, requestStatus: null, inviteId: null, inviteStatus: null };
        return {
            ...this.serializeCommunity(community),
            ...accessState,
        };
    }

    async toggleMembership(userId: string, idOrSlug: string) {
        const community = await this.getCommunity(idOrSlug, userId, true);
        const existingMember = community.members.find((member) => member.userId === userId);

        if (existingMember?.role === 'CREATOR') {
            return {
                isJoined: true,
                requested: false,
                memberCount: community.memberCount,
                community: this.serializeCommunity(community),
            };
        }

        if (community.isPrivate && !existingMember) {
            const request = await this.accessService.requestJoin(userId, community.id);
            return {
                ...request,
                memberCount: community.memberCount,
                community: this.serializeCommunity(community),
            };
        }

        if (existingMember) {
            await this.prisma.$transaction([
                this.prisma.communityMember.delete({
                    where: {
                        communityId_userId: {
                            communityId: community.id,
                            userId,
                        },
                    },
                }),
                this.prisma.community.updateMany({
                    where: { id: community.id, memberCount: { gt: 0 } },
                    data: { memberCount: { decrement: 1 } },
                }),
            ]);
        } else {
            await this.prisma.$transaction([
                this.prisma.communityMember.create({
                    data: {
                        communityId: community.id,
                        userId,
                    },
                }),
                this.prisma.community.update({
                    where: { id: community.id },
                    data: { memberCount: { increment: 1 } },
                }),
            ]);
        }

        const updatedCommunity = await this.getCommunity(community.id, userId, true);

        return {
            isJoined: !existingMember,
            requested: false,
            memberCount: updatedCommunity.memberCount,
            community: this.serializeCommunity(updatedCommunity),
        };
    }

    async findPosts(idOrSlug: string, page = 1, limit = 10, viewerId?: string) {
        const community = await this.getCommunity(idOrSlug, viewerId);
        const currentPage = Math.max(page || 1, 1);
        const take = Math.min(Math.max(limit || 10, 1), 50);
        const skip = (currentPage - 1) * take;

        const [posts, total] = await Promise.all([
            this.prisma.post.findMany({
                where: {
                    communityId: community.id,
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
                            role: true,
                        },
                    },
                    _count: {
                        select: { comments: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take,
            }),
            this.prisma.post.count({
                where: {
                    communityId: community.id,
                    status: 'ACTIVE',
                },
            }),
        ]);

        const postIds = posts.map((post) => post.id);
        const [likeCounts, viewerLikes] = await Promise.all([
            postIds.length > 0
                ? this.prisma.like.groupBy({
                    by: ['targetId'],
                    where: {
                        targetId: { in: postIds },
                        targetType: 'POST',
                    },
                    _count: true,
                })
                : [],
            viewerId && postIds.length > 0
                ? this.prisma.like.findMany({
                    where: {
                        userId: viewerId,
                        targetId: { in: postIds },
                        targetType: 'POST',
                    },
                    select: { targetId: true },
                })
                : [],
        ]);
        const likeCountMap = new Map(likeCounts.map((like) => [like.targetId, like._count]));
        const viewerLikeIds = new Set(viewerLikes.map((like) => like.targetId));

        return {
            posts: posts.map((post) => ({
                ...post,
                likesCount: likeCountMap.get(post.id) || 0,
                commentsCount: post._count.comments,
                viewsCount: post.viewsCount || 0,
                isLiked: viewerLikeIds.has(post.id),
            })),
            total,
            page: currentPage,
            lastPage: Math.ceil(total / take),
        };
    }

    async createPost(userId: string, idOrSlug: string, dto: CreateCommunityPostDto) {
        const community = await this.getCommunity(idOrSlug, userId, true);
        const member = community.members.find((communityMember) => communityMember.userId === userId);

        if (!member) {
            throw new ForbiddenException('Join this community before posting');
        }

        return this.postsService.create(userId, {
            ...dto,
            communityId: community.id,
        });
    }

    private async getCommunity(idOrSlug: string, viewerId?: string, allowPrivateLookup = false) {
        const community = await this.prisma.community.findFirst({
            where: UUID_REGEX.test(idOrSlug)
                ? { id: idOrSlug }
                : { slug: idOrSlug },
            include: {
                members: {
                    select: { userId: true, role: true },
                },
            },
        });

        if (!community) {
            throw new NotFoundException('Community not found');
        }

        const isMember = Boolean(viewerId && community.members.some((member) => member.userId === viewerId));
        if (community.isPrivate && !isMember && !allowPrivateLookup) {
            throw new NotFoundException('Community not found');
        }

        return community;
    }

    private async createUniqueSlug(name: string) {
        const baseSlug = name
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

        if (!baseSlug) {
            throw new BadRequestException('Community name must contain letters or numbers');
        }

        let slug = baseSlug;
        let suffix = 1;

        while (await this.prisma.community.findUnique({ where: { slug } })) {
            slug = `${baseSlug}-${suffix}`;
            suffix += 1;
        }

        return slug;
    }

    private serializeCommunity(community: any) {
        const members = community.members || [];

        return {
            ...community,
            memberIds: members.map((member: any) => member.userId),
            members,
        };
    }
}
