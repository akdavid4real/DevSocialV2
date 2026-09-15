import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { SocialUtilsService } from '../common/social-utils.service';
import { NotificationsService } from '../notifications/notifications.service';

const SPAM_KEYWORDS = ['spam', 'click here', 'buy now', 'limited offer', 'act now'];
const MAX_MENTIONS = 10;
const SERIALIZABLE_RETRIES = 3;

type PollOption = {
    id: string;
    text: string;
    votes: number;
    voters: string[];
};

type PostPoll = {
    question: string;
    options: PollOption[];
    totalVotes: number;
    endsAt?: string | null;
    settings?: {
        multipleChoice?: boolean;
        maxChoices?: number;
    };
};

type MentionCandidate = {
    id: string;
    username: string;
    privacySettings: unknown;
};

@Injectable()
export class PostsService {
    private readonly logger = new Logger(PostsService.name);

    constructor(
        private prisma: PrismaService,
        private socialUtils: SocialUtilsService,
        private notifications: NotificationsService,
    ) {}

    async create(userId: string, dto: CreatePostDto) {
        const content = dto.content?.trim() || '';
        const extractedTags = [...new Set(this.socialUtils.extractHashtags(content))];
        const extractedMentions = [...new Set(this.socialUtils.extractMentions(content))];

        if (extractedMentions.length > MAX_MENTIONS) {
            throw new BadRequestException(`Cannot mention more than ${MAX_MENTIONS} users`);
        }

        try {
            const result = await this.prisma.$transaction(async (tx) => {
                if (dto.communityId) {
                    const community = await tx.community.findUnique({
                        where: { id: dto.communityId },
                        select: { id: true },
                    });
                    if (!community) throw new NotFoundException('Community not found');
                }

                const candidates: MentionCandidate[] = extractedMentions.length
                    ? await tx.user.findMany({
                        where: {
                            username: {
                                in: extractedMentions,
                                mode: 'insensitive',
                            },
                        },
                        select: { id: true, username: true, privacySettings: true },
                    })
                    : [];
                const mentionedUsers = await this.filterMentionableUsers(tx, userId, candidates);

                const post = await tx.post.create({
                    data: {
                        authorId: userId,
                        content,
                        communityId: dto.communityId,
                        imageUrls: dto.imageUrls || [],
                        videoUrls: dto.videoUrls || [],
                        isAnonymous: dto.isAnonymous || false,
                        poll: dto.poll,
                        xpAwarded: 20,
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
                    },
                });

                for (const tagName of extractedTags) {
                    const normalizedName = tagName.toLowerCase();
                    const tag = await tx.tag.upsert({
                        where: { name: tagName },
                        update: { usageCount: { increment: 1 } },
                        create: {
                            name: tagName,
                            slug: normalizedName,
                            createdById: userId,
                            usageCount: 1,
                        },
                    });

                    await tx.postTag.create({
                        data: { postId: post.id, tagId: tag.id },
                    });
                }

                for (const mentionedUser of mentionedUsers) {
                    if (mentionedUser.id === userId) continue;
                    await tx.userMention.create({
                        data: {
                            postId: post.id,
                            mentionerId: userId,
                            mentionedId: mentionedUser.id,
                        },
                    });
                }

                await tx.user.update({
                    where: { id: userId },
                    data: { points: { increment: 20 } },
                });

                await tx.xpLog.create({
                    data: {
                        userId,
                        type: 'POST_CREATION',
                        xpAmount: 20,
                        refId: post.id,
                    },
                });

                await tx.activity.create({
                    data: {
                        userId,
                        type: 'POST_CREATED',
                        description: content.length > 100 ? `${content.substring(0, 100)}...` : content,
                        xpEarned: 20,
                        metadata: { postId: post.id },
                    },
                });

                if (dto.communityId) {
                    await tx.community.update({
                        where: { id: dto.communityId },
                        data: { postCount: { increment: 1 } },
                    });
                }

                const finalPost = await tx.post.findUnique({
                    where: { id: post.id },
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
                        tags: { include: { tag: true } },
                        mentions: {
                            include: {
                                mentioned: {
                                    select: {
                                        id: true,
                                        username: true,
                                        displayName: true,
                                        avatar: true,
                                    },
                                },
                            },
                        },
                    },
                });

                return { finalPost, mentionedUsers, author: post.author };
            });

            if (!result.finalPost) {
                throw new InternalServerErrorException('Failed to create post');
            }

            for (const mentionedUser of result.mentionedUsers) {
                if (mentionedUser.id === userId) continue;
                try {
                    await this.notifications.notifyMention(
                        mentionedUser.id,
                        userId,
                        result.finalPost.id,
                        result.author.displayName || result.author.username,
                    );
                } catch (error: any) {
                    this.logger.warn(`Post created but mention notification failed: ${error?.message || error}`);
                }
            }

            return result.finalPost;
        } catch (error: any) {
            if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
            this.logger.error(`Failed to create post: ${error?.message || error}`);
            throw new InternalServerErrorException('Failed to create post');
        }
    }

    async findAll(page = 1, limit = 10) {
        const safePage = Math.max(page || 1, 1);
        const safeLimit = Math.min(Math.max(limit || 10, 1), 50);
        const skip = (safePage - 1) * safeLimit;

        const [posts, total] = await Promise.all([
            this.prisma.post.findMany({
                where: { status: 'ACTIVE' },
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
                    _count: { select: { comments: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: safeLimit,
            }),
            this.prisma.post.count({ where: { status: 'ACTIVE' } }),
        ]);

        const postIds = posts.map((p) => p.id);
        const likeCounts = postIds.length
            ? await this.prisma.like.groupBy({
                by: ['targetId'],
                where: { targetId: { in: postIds }, targetType: 'POST' },
                _count: true,
            })
            : [];

        const likeCountMap = new Map(likeCounts.map((lc) => [lc.targetId, lc._count]));

        return {
            posts: posts.map((post) => ({
                ...post,
                likesCount: likeCountMap.get(post.id) || 0,
                commentsCount: post._count.comments,
                viewsCount: post.viewsCount || 0,
            })),
            total,
            page: safePage,
            lastPage: Math.ceil(total / safeLimit),
        };
    }

    async searchPosts(query: string) {
        const posts = await this.prisma.post.findMany({
            where: {
                status: 'ACTIVE',
                OR: [
                    { content: { contains: query, mode: 'insensitive' } },
                    { author: { username: { contains: query, mode: 'insensitive' } } },
                    { author: { displayName: { contains: query, mode: 'insensitive' } } },
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
                _count: { select: { comments: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });

        const postIds = posts.map((p) => p.id);
        const likeCounts = postIds.length
            ? await this.prisma.like.groupBy({
                by: ['targetId'],
                where: { targetId: { in: postIds }, targetType: 'POST' },
                _count: true,
            })
            : [];
        const likeCountMap = new Map(likeCounts.map((lc) => [lc.targetId, lc._count]));

        return posts.map((post) => ({
            ...post,
            likesCount: likeCountMap.get(post.id) || 0,
            commentsCount: post._count.comments,
            viewsCount: post.viewsCount || 0,
        }));
    }

    async findByTag(tagName: string, page = 1, limit = 10) {
        const normalizedTag = tagName.replace(/^#/, '').trim().toLowerCase();
        if (!normalizedTag) throw new BadRequestException('Tag name is required');

        const safePage = Math.max(page || 1, 1);
        const safeLimit = Math.min(Math.max(limit || 10, 1), 50);
        const skip = (safePage - 1) * safeLimit;
        const tag = await this.prisma.tag.findFirst({
            where: {
                OR: [
                    { slug: normalizedTag },
                    { name: { equals: normalizedTag, mode: 'insensitive' } },
                ],
            },
            select: {
                id: true,
                name: true,
                slug: true,
                usageCount: true,
                description: true,
                color: true,
            },
        });

        if (!tag) {
            return {
                tag: {
                    name: normalizedTag,
                    slug: normalizedTag,
                    usageCount: 0,
                    description: null,
                    color: '#3b82f6',
                },
                posts: [],
                total: 0,
                page: safePage,
                lastPage: 0,
            };
        }

        const where = {
            status: 'ACTIVE' as const,
            tags: { some: { tagId: tag.id } },
        };

        const [posts, total] = await Promise.all([
            this.prisma.post.findMany({
                where,
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
                    tags: { include: { tag: true } },
                    _count: { select: { comments: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: safeLimit,
            }),
            this.prisma.post.count({ where }),
        ]);

        const postIds = posts.map((p) => p.id);
        const likeCounts = postIds.length
            ? await this.prisma.like.groupBy({
                by: ['targetId'],
                where: { targetId: { in: postIds }, targetType: 'POST' },
                _count: true,
            })
            : [];
        const likeCountMap = new Map(likeCounts.map((lc) => [lc.targetId, lc._count]));

        return {
            tag,
            posts: posts.map((post) => ({
                ...post,
                likesCount: likeCountMap.get(post.id) || 0,
                commentsCount: post._count.comments,
                viewsCount: post.viewsCount || 0,
            })),
            total,
            page: safePage,
            lastPage: Math.ceil(total / safeLimit),
        };
    }

    async findOne(id: string) {
        const post = await this.prisma.post.findUnique({
            where: { id },
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
                _count: { select: { comments: true } },
            },
        });

        if (!post) throw new NotFoundException('Post not found');

        const likesCount = await this.prisma.like.count({
            where: { targetId: id, targetType: 'POST' },
        });

        return { ...post, likesCount, commentsCount: post._count.comments };
    }

    async votePoll(postId: string, userId: string, optionIds: string[]) {
        if (!Array.isArray(optionIds) || optionIds.length === 0) {
            throw new BadRequestException('At least one poll option is required');
        }

        for (let attempt = 1; attempt <= SERIALIZABLE_RETRIES; attempt += 1) {
            try {
                return await this.prisma.$transaction(async (tx) => {
                    const post = await tx.post.findUnique({
                        where: { id: postId },
                        select: { id: true, poll: true, status: true },
                    });

                    if (!post || post.status !== 'ACTIVE') throw new NotFoundException('Post not found');

                    const poll = post.poll as PostPoll | null;
                    if (!poll || !Array.isArray(poll.options)) throw new NotFoundException('Poll not found');
                    if (poll.endsAt && new Date(poll.endsAt).getTime() < Date.now()) {
                        throw new BadRequestException('Poll has ended');
                    }

                    const uniqueOptionIds = [...new Set(optionIds)];
                    const validOptionIds = new Set(poll.options.map((option) => option.id));
                    if (uniqueOptionIds.some((optionId) => !validOptionIds.has(optionId))) {
                        throw new BadRequestException('Invalid poll option');
                    }

                    if (poll.options.some((option) => (option.voters || []).includes(userId))) {
                        throw new BadRequestException('You have already voted in this poll');
                    }

                    const multipleChoice = Boolean(poll.settings?.multipleChoice);
                    const maxChoices = poll.settings?.maxChoices || 1;
                    if (!multipleChoice && uniqueOptionIds.length > 1) {
                        throw new BadRequestException('This poll only allows one choice');
                    }
                    if (multipleChoice && uniqueOptionIds.length > maxChoices) {
                        throw new BadRequestException(`This poll allows up to ${maxChoices} choices`);
                    }

                    const selectedOptions = new Set(uniqueOptionIds);
                    const updatedPoll: PostPoll = {
                        ...poll,
                        options: poll.options.map((option) => {
                            if (!selectedOptions.has(option.id)) {
                                return { ...option, voters: option.voters || [] };
                            }
                            return {
                                ...option,
                                votes: (option.votes || 0) + 1,
                                voters: [...(option.voters || []), userId],
                            };
                        }),
                        totalVotes: (poll.totalVotes || 0) + 1,
                    };

                    await tx.post.update({
                        where: { id: postId },
                        data: { poll: updatedPoll as any },
                    });
                    await tx.user.update({
                        where: { id: userId },
                        data: { points: { increment: 5 } },
                    });
                    await tx.xpLog.create({
                        data: {
                            userId,
                            type: 'POLL_INTERACTION',
                            xpAmount: 5,
                            refId: postId,
                        },
                    });

                    return { poll: updatedPoll, xpAwarded: 5 };
                }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
            } catch (error: any) {
                if (error?.code === 'P2034' && attempt < SERIALIZABLE_RETRIES) continue;
                throw error;
            }
        }

        throw new InternalServerErrorException('Unable to record poll vote');
    }

    async trackView(postId: string, userId?: string, ipAddress?: string, userAgent?: string) {
        try {
            await this.prisma.$transaction(async (tx) => {
                await tx.view.create({
                    data: {
                        postId,
                        userId,
                        ipAddress: ipAddress || 'unknown',
                        userAgent,
                    },
                });
                await tx.post.update({
                    where: { id: postId },
                    data: { viewsCount: { increment: 1 } },
                });
            });
        } catch (error: any) {
            if (error?.code !== 'P2002') {
                this.logger.error(`Failed to track view: ${error?.message || error}`);
            }
        }
    }

    async remove(id: string, userId: string) {
        const post = await this.prisma.post.findUnique({ where: { id } });
        if (!post) throw new NotFoundException('Post not found');
        if (post.authorId !== userId) throw new ForbiddenException('Unauthorized delete');
        return this.prisma.post.delete({ where: { id } });
    }

    async findAllByUser(userId: string) {
        const posts = await this.prisma.post.findMany({
            where: { authorId: userId },
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

        const postIds = posts.map((p) => p.id);
        const likeCounts = postIds.length
            ? await this.prisma.like.groupBy({
                by: ['targetId'],
                where: { targetId: { in: postIds }, targetType: 'POST' },
                _count: true,
            })
            : [];
        const likeCountMap = new Map(likeCounts.map((lc) => [lc.targetId, lc._count]));

        return posts.map((post) => ({
            ...post,
            likesCount: likeCountMap.get(post.id) || 0,
            commentsCount: post._count.comments,
            viewsCount: post.viewsCount || 0,
        }));
    }

    async toggleLike(postId: string, userId: string) {
        const post = await this.prisma.post.findUnique({
            where: { id: postId },
            select: { authorId: true },
        });
        if (!post) throw new NotFoundException('Post not found');

        const existingLike = await this.prisma.like.findUnique({
            where: {
                userId_targetId_targetType: { userId, targetId: postId, targetType: 'POST' },
            },
        });

        if (existingLike) {
            await this.prisma.like.delete({
                where: {
                    userId_targetId_targetType: { userId, targetId: postId, targetType: 'POST' },
                },
            });
            return { liked: false };
        }

        await this.prisma.like.create({
            data: { userId, targetId: postId, targetType: 'POST' },
        });

        const likedPost = await this.prisma.post.findUnique({
            where: { id: postId },
            select: { content: true, author: { select: { username: true } } },
        });

        await this.prisma.activity.create({
            data: {
                userId,
                type: 'LIKE_GIVEN',
                description: likedPost?.content
                    ? likedPost.content.length > 80
                        ? `${likedPost.content.substring(0, 80)}...`
                        : likedPost.content
                    : 'Liked a post',
                xpEarned: 0,
                metadata: { postId, authorUsername: likedPost?.author.username },
            },
        });

        if (post.authorId !== userId) {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { username: true, displayName: true },
            });
            try {
                await this.notifications.notifyLike(
                    post.authorId,
                    userId,
                    postId,
                    user?.displayName || user?.username || 'Someone',
                );
            } catch (error: any) {
                this.logger.warn(`Like saved but notification failed: ${error?.message || error}`);
            }
        }

        return { liked: true };
    }

    async addComment(
        postId: string,
        userId: string,
        content: string,
        parentId?: string,
        imageUrls: string[] = [],
        videoUrls: string[] = [],
    ) {
        if (!content.trim() && imageUrls.length === 0 && videoUrls.length === 0) {
            throw new BadRequestException('Comment cannot be empty');
        }

        const lowerContent = content.toLowerCase();
        if (SPAM_KEYWORDS.some((keyword) => lowerContent.includes(keyword))) {
            this.logger.warn(`Potential spam detected from user ${userId}`);
        }

        const mentions = [...new Set(this.socialUtils.extractMentions(content))];
        if (mentions.length > MAX_MENTIONS) {
            throw new BadRequestException(`Cannot mention more than ${MAX_MENTIONS} users`);
        }

        const [post, parentComment, user, candidates] = await Promise.all([
            this.prisma.post.findUnique({
                where: { id: postId },
                select: { authorId: true },
            }),
            parentId
                ? this.prisma.comment.findUnique({
                    where: { id: parentId },
                    select: { authorId: true, postId: true },
                })
                : null,
            this.prisma.user.findUnique({
                where: { id: userId },
                select: { username: true, displayName: true },
            }),
            mentions.length
                ? this.prisma.user.findMany({
                    where: { username: { in: mentions, mode: 'insensitive' } },
                    select: { id: true, username: true, privacySettings: true },
                })
                : Promise.resolve([] as MentionCandidate[]),
        ]);

        if (!post) throw new NotFoundException('Post not found');
        if (parentId && !parentComment) throw new NotFoundException('Parent comment not found');
        if (parentComment && parentComment.postId !== postId) {
            throw new BadRequestException('Parent comment does not belong to this post');
        }

        const mentionedUsers = await this.filterMentionableUsers(this.prisma, userId, candidates as MentionCandidate[]);
        const xpAmount = parentId ? 3 : 5;
        const comment = await this.prisma.$transaction(async (tx) => {
            const created = await tx.comment.create({
                data: {
                    content,
                    postId,
                    authorId: userId,
                    parentId,
                    imageUrls,
                    videoUrls,
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
                },
            });

            await tx.user.update({
                where: { id: userId },
                data: { points: { increment: xpAmount } },
            });
            await tx.xpLog.create({
                data: {
                    userId,
                    type: 'COMMENT_CREATION',
                    xpAmount,
                    refId: created.id,
                },
            });
            await tx.activity.create({
                data: {
                    userId,
                    type: 'COMMENT_CREATED',
                    description: content.length > 100 ? `${content.substring(0, 100)}...` : content,
                    xpEarned: xpAmount,
                    metadata: { postId, commentId: created.id, isReply: Boolean(parentId) },
                },
            });

            for (const mentionedUser of mentionedUsers) {
                if (mentionedUser.id === userId) continue;
                await tx.userMention.create({
                    data: {
                        postId,
                        commentId: created.id,
                        mentionerId: userId,
                        mentionedId: mentionedUser.id,
                    },
                });
            }

            return created;
        });

        const senderName = user?.displayName || user?.username || 'Someone';

        try {
            for (const mentionedUser of mentionedUsers) {
                if (mentionedUser.id !== userId) {
                    await this.notifications.notifyCommentMention(
                        mentionedUser.id,
                        userId,
                        comment.id,
                        postId,
                        senderName,
                    );
                }
            }

            if (!parentId && post.authorId !== userId) {
                await this.notifications.notifyComment(
                    post.authorId,
                    userId,
                    postId,
                    senderName,
                    content,
                );
            }

            if (parentId && parentComment && parentComment.authorId !== userId) {
                await this.notifications.notifyReply(
                    parentComment.authorId,
                    userId,
                    comment.id,
                    postId,
                    senderName,
                    content,
                );
            }
        } catch (error: any) {
            this.logger.warn(`Comment saved but notification failed: ${error?.message || error}`);
        }

        return { ...comment, xpAwarded: xpAmount };
    }

    async getComments(postId: string, page = 1, limit = 20, userId?: string) {
        const safePage = Math.max(page || 1, 1);
        const safeLimit = Math.min(Math.max(limit || 20, 1), 100);
        const skip = (safePage - 1) * safeLimit;
        const [comments, total] = await Promise.all([
            this.prisma.comment.findMany({
                where: { postId, parentId: null },
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
                    _count: { select: { replies: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: safeLimit,
            }),
            this.prisma.comment.count({ where: { postId, parentId: null } }),
        ]);

        const commentIds = comments.map((c) => c.id);
        let userLikes = new Set<string>();
        if (userId && commentIds.length > 0) {
            const likes = await this.prisma.like.findMany({
                where: { userId, targetId: { in: commentIds }, targetType: 'COMMENT' },
                select: { targetId: true },
            });
            userLikes = new Set(likes.map((l) => l.targetId));
        }

        return {
            comments: comments.map((comment) => ({
                ...comment,
                repliesCount: comment._count.replies,
                isLiked: userLikes.has(comment.id),
            })),
            total,
            page: safePage,
            lastPage: Math.ceil(total / safeLimit),
            hasMore: safePage < Math.ceil(total / safeLimit),
        };
    }

    async removeComment(commentId: string, userId: string) {
        const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
        if (!comment) throw new NotFoundException('Comment not found');
        if (comment.authorId !== userId) throw new ForbiddenException('Unauthorized deletion request');
        return this.prisma.comment.delete({ where: { id: commentId } });
    }

    async getReplies(commentId: string, page = 1, limit = 10, userId?: string) {
        const safePage = Math.max(page || 1, 1);
        const safeLimit = Math.min(Math.max(limit || 10, 1), 100);
        const skip = (safePage - 1) * safeLimit;
        const [replies, total] = await Promise.all([
            this.prisma.comment.findMany({
                where: { parentId: commentId },
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
                },
                orderBy: { createdAt: 'asc' },
                skip,
                take: safeLimit,
            }),
            this.prisma.comment.count({ where: { parentId: commentId } }),
        ]);

        let userLikes = new Set<string>();
        if (userId && replies.length > 0) {
            const likes = await this.prisma.like.findMany({
                where: {
                    userId,
                    targetId: { in: replies.map((reply) => reply.id) },
                    targetType: 'COMMENT',
                },
                select: { targetId: true },
            });
            userLikes = new Set(likes.map((l) => l.targetId));
        }

        return {
            replies: replies.map((reply) => ({ ...reply, isLiked: userLikes.has(reply.id) })),
            total,
            page: safePage,
            lastPage: Math.ceil(total / safeLimit),
            hasMore: safePage < Math.ceil(total / safeLimit),
        };
    }

    async toggleCommentLike(commentId: string, userId: string) {
        try {
            const result = await this.prisma.$transaction(async (tx) => {
                const comment = await tx.comment.findUnique({
                    where: { id: commentId },
                    select: { id: true, authorId: true, postId: true, likesCount: true },
                });
                if (!comment) throw new NotFoundException('Comment not found');

                const existingLike = await tx.like.findUnique({
                    where: {
                        userId_targetId_targetType: {
                            userId,
                            targetId: commentId,
                            targetType: 'COMMENT',
                        },
                    },
                });

                const isOwnComment = userId === comment.authorId;

                if (existingLike) {
                    await tx.like.delete({
                        where: {
                            userId_targetId_targetType: {
                                userId,
                                targetId: commentId,
                                targetType: 'COMMENT',
                            },
                        },
                    });
                    await tx.comment.updateMany({
                        where: { id: commentId, likesCount: { gt: 0 } },
                        data: { likesCount: { decrement: 1 } },
                    });

                    if (!isOwnComment) {
                        await tx.user.update({
                            where: { id: comment.authorId },
                            data: { points: { decrement: 1 } },
                        });
                        await tx.xpLog.deleteMany({
                            where: {
                                userId: comment.authorId,
                                type: 'LIKE_RECEIVED',
                                refId: commentId,
                            },
                        });
                    }

                    const refreshed = await tx.comment.findUnique({
                        where: { id: commentId },
                        select: { likesCount: true },
                    });

                    return {
                        liked: false,
                        likesCount: refreshed?.likesCount ?? Math.max(0, comment.likesCount - 1),
                        xpChange: isOwnComment ? 0 : -1,
                        isOwnComment,
                        comment,
                    };
                }

                await tx.like.create({
                    data: { userId, targetId: commentId, targetType: 'COMMENT' },
                });
                await tx.comment.update({
                    where: { id: commentId },
                    data: { likesCount: { increment: 1 } },
                });

                if (!isOwnComment) {
                    await tx.user.update({
                        where: { id: comment.authorId },
                        data: { points: { increment: 1 } },
                    });
                    await tx.xpLog.create({
                        data: {
                            userId: comment.authorId,
                            type: 'LIKE_RECEIVED',
                            xpAmount: 1,
                            refId: commentId,
                        },
                    });
                }

                return {
                    liked: true,
                    likesCount: comment.likesCount + 1,
                    xpChange: isOwnComment ? 0 : 1,
                    isOwnComment,
                    comment,
                };
            }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

            if (result.liked && !result.isOwnComment) {
                const user = await this.prisma.user.findUnique({
                    where: { id: userId },
                    select: { username: true, displayName: true },
                });
                try {
                    await this.notifications.notifyCommentLike(
                        result.comment.authorId,
                        userId,
                        commentId,
                        result.comment.postId,
                        user?.displayName || user?.username || 'Someone',
                    );
                } catch (error: any) {
                    this.logger.warn(`Comment like saved but notification failed: ${error?.message || error}`);
                }
            }

            const { comment: _comment, ...response } = result;
            return response;
        } catch (error: any) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
            if (error?.code === 'P2002') {
                throw new BadRequestException('Like state changed concurrently; retry the request');
            }
            this.logger.error(`Failed to toggle comment like: ${error?.message || error}`);
            throw new InternalServerErrorException('Failed to toggle comment like');
        }
    }

    private async filterMentionableUsers(
        db: Prisma.TransactionClient | PrismaService,
        mentionerId: string,
        candidates: MentionCandidate[],
    ) {
        const targetIds = candidates
            .filter((candidate) => candidate.id !== mentionerId)
            .map((candidate) => candidate.id);

        const blocks = targetIds.length
            ? await db.block.findMany({
                where: {
                    OR: [
                        { blockerId: mentionerId, blockedId: { in: targetIds } },
                        { blockerId: { in: targetIds }, blockedId: mentionerId },
                    ],
                },
                select: { blockerId: true, blockedId: true },
            })
            : [];

        const blockedIds = new Set<string>();
        for (const block of blocks) {
            blockedIds.add(block.blockerId === mentionerId ? block.blockedId : block.blockerId);
        }

        return candidates.filter((candidate) => {
            if (candidate.id === mentionerId) return true;
            if (blockedIds.has(candidate.id)) return false;
            const settings = candidate.privacySettings && typeof candidate.privacySettings === 'object' && !Array.isArray(candidate.privacySettings)
                ? candidate.privacySettings as Record<string, unknown>
                : {};
            return settings.allowMentions !== false;
        });
    }
}
