import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { PostsService } from '../posts/posts.service';
import { CreateCommunityDto } from './dto/create-community.dto';
import { CreateCommunityPostDto } from './dto/create-community-post.dto';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class CommunitiesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly postsService: PostsService,
    ) {}

    async findAll(options: { page: number; limit: number; search?: string; category?: string }) {
        const page = Math.max(options.page || 1, 1);
        const limit = Math.min(Math.max(options.limit || 12, 1), 50);
        const skip = (page - 1) * limit;
        const category = options.category?.toUpperCase();

        const where: any = {
            ...(category ? { category } : {}),
            ...(options.search
                ? {
                    OR: [
                        { name: { contains: options.search, mode: 'insensitive' } },
                        { description: { contains: options.search, mode: 'insensitive' } },
                    ],
                }
                : {}),
        };

        const [communities, total] = await Promise.all([
            this.prisma.community.findMany({
                where,
                include: {
                    members: {
                        select: {
                            userId: true,
                            role: true,
                        },
                    },
                },
                orderBy: [{ memberCount: 'desc' }, { createdAt: 'desc' }],
                skip,
                take: limit,
            }),
            this.prisma.community.count({ where }),
        ]);

        return {
            communities: communities.map((community) => this.serializeCommunity(community)),
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
                    select: {
                        userId: true,
                        role: true,
                    },
                },
            },
        });

        return this.serializeCommunity(community);
    }

    async findOne(idOrSlug: string) {
        const community = await this.getCommunity(idOrSlug);
        return this.serializeCommunity(community);
    }

    async toggleMembership(userId: string, idOrSlug: string) {
        const community = await this.getCommunity(idOrSlug);
        const existingMember = community.members.find((member) => member.userId === userId);

        if (existingMember?.role === 'CREATOR') {
            return {
                isJoined: true,
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
                this.prisma.community.update({
                    where: { id: community.id },
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

        const updatedCommunity = await this.getCommunity(community.id);

        return {
            isJoined: !existingMember,
            memberCount: updatedCommunity.memberCount,
            community: this.serializeCommunity(updatedCommunity),
        };
    }

    async findPosts(idOrSlug: string, page = 1, limit = 10) {
        const community = await this.getCommunity(idOrSlug);
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
                        select: {
                            comments: true,
                        },
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
        const likeCountMap = new Map(likeCounts.map((like) => [like.targetId, like._count]));

        return {
            posts: posts.map((post) => ({
                ...post,
                likesCount: likeCountMap.get(post.id) || 0,
                commentsCount: post._count.comments,
                viewsCount: post.viewsCount || 0,
            })),
            total,
            page: currentPage,
            lastPage: Math.ceil(total / take),
        };
    }

    async createPost(userId: string, idOrSlug: string, dto: CreateCommunityPostDto) {
        const community = await this.getCommunity(idOrSlug);
        const member = community.members.find((communityMember) => communityMember.userId === userId);

        if (!member) {
            throw new ForbiddenException('Join this community before posting');
        }

        return this.postsService.create(userId, {
            ...dto,
            communityId: community.id,
        });
    }

    private async getCommunity(idOrSlug: string) {
        const community = await this.prisma.community.findFirst({
            where: UUID_REGEX.test(idOrSlug)
                ? { id: idOrSlug }
                : { slug: idOrSlug },
            include: {
                members: {
                    select: {
                        userId: true,
                        role: true,
                    },
                },
            },
        });

        if (!community) {
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
