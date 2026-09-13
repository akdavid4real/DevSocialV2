import { Injectable, InternalServerErrorException, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { SocialUtilsService } from '../common/social-utils.service';
import { NotificationsService } from '../notifications/notifications.service';

const SPAM_KEYWORDS = ['spam', 'click here', 'buy now', 'limited offer', 'act now'];
const MAX_MENTIONS = 10;

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

@Injectable()
export class PostsService {
    private readonly logger = new Logger(PostsService.name);
    constructor(
        private prisma: PrismaService,
        private socialUtils: SocialUtilsService,
        private notifications: NotificationsService,
    ) { }


    async create(userId: string, dto: CreatePostDto) {
        try {
            const content = dto.content?.trim() || '';

            const post = await this.prisma.post.create({
                data: {
                    authorId: userId,
                    content,
                    communityId: dto.communityId,
                    imageUrls: dto.imageUrls || [],
                    videoUrls: dto.videoUrls || [],
                    isAnonymous: dto.isAnonymous || false,
                    poll: dto.poll,
                    xpAwarded: 20, // Default XP
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

            // Handle Tags and Mentions server-side to ensure consistency
            const extractedTags = this.socialUtils.extractHashtags(content);
            const extractedMentions = this.socialUtils.extractMentions(content);

            // Create Tag and PostTag records
            if (extractedTags.length > 0) {
                for (const tagName of extractedTags) {
                    const tag = await this.prisma.tag.upsert({
                        where: { name: tagName },
                        update: { usageCount: { increment: 1 } },
                        create: {
                            name: tagName,
                            slug: tagName.toLowerCase(),
                            createdById: userId,
                            usageCount: 1
                        },
                    });

                    await this.prisma.postTag.upsert({
                        where: {
                            postId_tagId: {
                                postId: post.id,
                                tagId: tag.id
                            }
                        },
                        update: {},
                        create: {
                            postId: post.id,
                            tagId: tag.id
                        }
                    });
                }
            }

            // Create UserMention records and notifications
            if (extractedMentions.length > 0) {
                const mentionedUsers = await this.prisma.user.findMany({
                    where: {
                        username: {
                            in: extractedMentions,
                            mode: 'insensitive',
                        },
                    },
                    select: { id: true, username: true },
                });

                for (const mentionedUser of mentionedUsers) {
                    if (mentionedUser.id === userId) continue; // Don't notify self

                    await this.prisma.userMention.create({
                        data: {
                            postId: post.id,
                            mentionerId: userId,
                            mentionedId: mentionedUser.id,
                        },
                    });

                    // Trigger notification
                    await this.notifications.notifyMention(
                        mentionedUser.id,
                        userId,
                        post.id,
                        post.author.displayName || post.author.username,
                    );
                }
            }

            // Award XP to user
            await this.prisma.user.update({
                where: { id: userId },
                data: {
                    points: { increment: 20 },
                },
            });

            // Log XP
            await this.prisma.xpLog.create({
                data: {
                    userId,
                    type: 'POST_CREATION',
                    xpAmount: 20,
                    refId: post.id,
                },
            });

            // Create Activity record
            await this.prisma.activity.create({
                data: {
                    userId,
                    type: 'POST_CREATED',
                    description: content.length > 100 ? `${content.substring(0, 100)}...` : content,
                    xpEarned: 20,
                    metadata: { postId: post.id },
                },
            });

            if (dto.communityId) {
                await this.prisma.community.update({
                    where: { id: dto.communityId },
                    data: { postCount: { increment: 1 } },
                });
            }

            // Refetch post with all relations to match the expected return type
            const finalPost = await this.prisma.post.findUnique({
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
                    tags: {
                        include: {
                            tag: true,
                        },
                    },
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

            return finalPost;
        } catch (error) {
            this.logger.error(`Failed to create post: ${error.message}`);
            throw new InternalServerErrorException('Failed to create post');
        }
    }

    async findAll(page = 1, limit = 10) {
        this.logger.log(`Fetching all active posts (Page: ${page}, Limit: ${limit})`);
        const skip = (page - 1) * limit;

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
                    _count: {
                        select: {
                            comments: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.post.count({ where: { status: 'ACTIVE' } }),
        ]);

        // Get like counts separately
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

        return {
            posts: posts.map(post => ({
                ...post,
                likesCount: likeCountMap.get(post.id) || 0,
                commentsCount: post._count.comments,
                viewsCount: post.viewsCount || 0,
            })),
            total,
            page,
            lastPage: Math.ceil(total / limit),
        };
    }

    async searchPosts(query: string) {
        this.logger.log(`Searching posts with query: ${query}`);
        
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
                _count: {
                    select: {
                        comments: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });

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

        return posts.map(post => ({
            ...post,
            likesCount: likeCountMap.get(post.id) || 0,
            commentsCount: post._count.comments,
            viewsCount: post.viewsCount || 0,
        }));
    }

    async findByTag(tagName: string, page = 1, limit = 10) {
        const normalizedTag = tagName.replace(/^#/, '').trim().toLowerCase();

        if (!normalizedTag) {
            throw new BadRequestException('Tag name is required');
        }

        const skip = (page - 1) * limit;
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
                page,
                lastPage: 0,
            };
        }

        const where = {
            status: 'ACTIVE' as const,
            tags: {
                some: {
                    tagId: tag.id,
                },
            },
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
            }),
            this.prisma.post.count({ where }),
        ]);

        const postIds = posts.map(p => p.id);
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

        const likeCountMap = new Map(likeCounts.map(lc => [lc.targetId, lc._count]));

        return {
            tag,
            posts: posts.map(post => ({
                ...post,
                likesCount: likeCountMap.get(post.id) || 0,
                commentsCount: post._count.comments,
                viewsCount: post.viewsCount || 0,
            })),
            total,
            page,
            lastPage: Math.ceil(total / limit),
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
                _count: {
                    select: {
                        comments: true,
                    },
                },
            },
        });

        if (!post) {
            throw new NotFoundException('Post not found');
        }

        // Get like count separately
        const likesCount = await this.prisma.like.count({
            where: {
                targetId: id,
                targetType: 'POST',
            },
        });

        return {
            ...post,
            likesCount,
            commentsCount: post._count.comments,
        };
    }

    async votePoll(postId: string, userId: string, optionIds: string[]) {
        if (!Array.isArray(optionIds) || optionIds.length === 0) {
            throw new BadRequestException('At least one poll option is required');
        }

        const post = await this.prisma.post.findUnique({
            where: { id: postId },
            select: {
                id: true,
                poll: true,
                status: true,
            },
        });

        if (!post || post.status !== 'ACTIVE') {
            throw new NotFoundException('Post not found');
        }

        const poll = post.poll as PostPoll | null;
        if (!poll || !Array.isArray(poll.options)) {
            throw new NotFoundException('Poll not found');
        }

        if (poll.endsAt && new Date(poll.endsAt).getTime() < Date.now()) {
            throw new BadRequestException('Poll has ended');
        }

        const uniqueOptionIds = [...new Set(optionIds)];
        const validOptionIds = new Set(poll.options.map((option) => option.id));
        const invalidOption = uniqueOptionIds.find((optionId) => !validOptionIds.has(optionId));
        if (invalidOption) {
            throw new BadRequestException('Invalid poll option');
        }

        const hasVoted = poll.options.some((option) => (option.voters || []).includes(userId));
        if (hasVoted) {
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
                if (!selectedOptions.has(option.id)) return { ...option, voters: option.voters || [] };
                return {
                    ...option,
                    votes: (option.votes || 0) + 1,
                    voters: [...(option.voters || []), userId],
                };
            }),
            totalVotes: (poll.totalVotes || 0) + 1,
        };

        await this.prisma.$transaction([
            this.prisma.post.update({
                where: { id: postId },
                data: { poll: updatedPoll as any },
            }),
            this.prisma.user.update({
                where: { id: userId },
                data: { points: { increment: 5 } },
            }),
            this.prisma.xpLog.create({
                data: {
                    userId,
                    type: 'POLL_INTERACTION',
                    xpAmount: 5,
                    refId: postId,
                },
            }),
        ]);

        return {
            poll: updatedPoll,
            xpAwarded: 5,
        };
    }

    async trackView(postId: string, userId?: string, ipAddress?: string, userAgent?: string) {
        try {
            // Create view record (unique constraint prevents duplicates)
            await this.prisma.view.create({
                data: {
                    postId,
                    userId,
                    ipAddress: ipAddress || 'unknown',
                    userAgent,
                },
            });

            // Increment viewsCount
            await this.prisma.post.update({
                where: { id: postId },
                data: { viewsCount: { increment: 1 } },
            });

            this.logger.log(`View tracked for post ${postId}`);
        } catch (error) {
            // Ignore duplicate view errors (unique constraint violation)
            if (!error.code || error.code !== 'P2002') {
                this.logger.error(`Failed to track view: ${error.message}`);
            }
        }
    }

    async remove(id: string, userId: string) {
        const post = await this.prisma.post.findUnique({
            where: { id },
        });

        if (!post) {
            throw new NotFoundException('Post not found');
        }

        if (post.authorId !== userId) {
            throw new InternalServerErrorException('Unauthorized delete');
        }

        return this.prisma.post.delete({
            where: { id },
        });
    }

    async findAllByUser(userId: string) {
        this.logger.log(`Fetching timeline for User ID: ${userId}`);
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
                _count: {
                    select: {
                        comments: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Get like counts separately
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

        return posts.map(post => ({
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

        if (!post) {
            throw new NotFoundException('Post not found');
        }

        const existingLike = await this.prisma.like.findUnique({
            where: {
                userId_targetId_targetType: {
                    userId,
                    targetId: postId,
                    targetType: 'POST',
                },
            },
        });

        if (existingLike) {
            await this.prisma.like.delete({
                where: {
                    userId_targetId_targetType: {
                        userId,
                        targetId: postId,
                        targetType: 'POST',
                    },
                },
            });
            return { liked: false };
        } else {
            await this.prisma.like.create({
                data: {
                    userId,
                    targetId: postId,
                    targetType: 'POST',
                },
            });

            // Create Activity record
            const likedPost = await this.prisma.post.findUnique({
                where: { id: postId },
                select: { content: true, author: { select: { username: true } } },
            });
            
            await this.prisma.activity.create({
                data: {
                    userId,
                    type: 'LIKE_GIVEN',
                    description: likedPost?.content ? (likedPost.content.length > 80 ? `${likedPost.content.substring(0, 80)}...` : likedPost.content) : 'Liked a post',
                    xpEarned: 0,
                    metadata: { postId, authorUsername: likedPost?.author.username },
                },
            });

            // Send notification to post author (only if not liking own post)
            if (post.authorId !== userId) {
                const user = await this.prisma.user.findUnique({
                    where: { id: userId },
                    select: { username: true, displayName: true },
                });
                const senderName = user?.displayName || user?.username || 'Someone';

                await this.notifications.notifyLike(
                    post.authorId,
                    userId,
                    postId,
                    senderName,
                );

                this.logger.log(`User ${userId} liked post ${postId}, notified author ${post.authorId}`);
            }

            return { liked: true };
        }
    }

    async addComment(postId: string, userId: string, content: string, parentId?: string, imageUrls: string[] = [], videoUrls: string[] = []) {
        // Content validation
        if (!content.trim() && imageUrls.length === 0 && videoUrls.length === 0) {
            throw new BadRequestException('Comment cannot be empty');
        }

        // Spam detection
        const lowerContent = content.toLowerCase();
        const hasSpam = SPAM_KEYWORDS.some(keyword => lowerContent.includes(keyword));
        if (hasSpam) {
            this.logger.warn(`Potential spam detected from user ${userId}`);
        }

        // Extract mentions and validate count
        const mentions = this.socialUtils.extractMentions(content);
        if (mentions.length > MAX_MENTIONS) {
            throw new BadRequestException(`Cannot mention more than ${MAX_MENTIONS} users`);
        }
        // Get post and parent comment info
        const [post, parentComment] = await Promise.all([
            this.prisma.post.findUnique({
                where: { id: postId },
                select: { authorId: true },
            }),
            parentId ? this.prisma.comment.findUnique({
                where: { id: parentId },
                select: { authorId: true },
            }) : null,
        ]);

        if (!post) {
            throw new Error('Post not found');
        }

        // Get user info for notifications
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { username: true, displayName: true },
        });

        const senderName = user?.displayName || user?.username || 'Someone';

        const comment = await this.prisma.comment.create({
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

        // Award XP for comment creation
        const xpAmount = parentId ? 3 : 5;
        
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                points: { increment: xpAmount },
            },
        });

        await this.prisma.xpLog.create({
            data: {
                userId,
                type: 'COMMENT_CREATION',
                xpAmount,
                refId: comment.id,
            },
        });

        // Create Activity record
        await this.prisma.activity.create({
            data: {
                userId,
                type: 'COMMENT_CREATED',
                description: content.length > 100 ? `${content.substring(0, 100)}...` : content,
                xpEarned: xpAmount,
                metadata: { postId, commentId: comment.id, isReply: !!parentId },
            },
        });

        // Process mentions in comment
        if (mentions.length > 0) {
            const mentionedUsers = await this.prisma.user.findMany({
                where: {
                    username: {
                        in: mentions,
                        mode: 'insensitive',
                    },
                },
                select: { id: true },
            });

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
        }

        // Notify post author about new comment (if not commenting on own post)
        if (!parentId && post.authorId !== userId) {
            await this.notifications.notifyComment(
                post.authorId,
                userId,
                postId,
                senderName,
                content,
            );
        }

        // Notify parent comment author about reply (if replying to someone else)
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

        this.logger.log(`User ${userId} earned ${xpAmount} XP for ${parentId ? 'reply' : 'comment'}`);

        return {
            ...comment,
            xpAwarded: xpAmount,
        };
    }

    async getComments(postId: string, page = 1, limit = 20, userId?: string) {
        const skip = (page - 1) * limit;

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
                    _count: {
                        select: {
                            replies: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.comment.count({ where: { postId, parentId: null } }),
        ]);

        // Get comment IDs for like counts
        const commentIds = comments.map(c => c.id);

        // Fetch user's likes for comments
        let userLikes: Set<string> = new Set();
        if (userId) {
            const likes = await this.prisma.like.findMany({
                where: {
                    userId,
                    targetId: { in: commentIds },
                    targetType: 'COMMENT',
                },
                select: { targetId: true },
            });
            userLikes = new Set(likes.map(l => l.targetId));
        }

        return {
            comments: comments.map(comment => ({
                ...comment,
                repliesCount: comment._count.replies,
                isLiked: userLikes.has(comment.id),
            })),
            total,
            page,
            lastPage: Math.ceil(total / limit),
            hasMore: page < Math.ceil(total / limit),
        };
    }

    async removeComment(commentId: string, userId: string) {
        const comment = await this.prisma.comment.findUnique({
            where: { id: commentId },
        });

        if (!comment) {
            throw new Error('Comment not found');
        }

        if (comment.authorId !== userId) {
            throw new Error('Unauthorized deletion request');
        }

        return this.prisma.comment.delete({
            where: { id: commentId },
        });
    }

    async getReplies(commentId: string, page = 1, limit = 10, userId?: string) {
        const skip = (page - 1) * limit;

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
                take: limit,
            }),
            this.prisma.comment.count({ where: { parentId: commentId } }),
        ]);

        // Get user's likes for replies
        let userLikes: Set<string> = new Set();
        if (userId) {
            const replyIds = replies.map(r => r.id);
            const likes = await this.prisma.like.findMany({
                where: {
                    userId,
                    targetId: { in: replyIds },
                    targetType: 'COMMENT',
                },
                select: { targetId: true },
            });
            userLikes = new Set(likes.map(l => l.targetId));
        }

        return {
            replies: replies.map(reply => ({
                ...reply,
                isLiked: userLikes.has(reply.id),
            })),
            total,
            page,
            lastPage: Math.ceil(total / limit),
            hasMore: page < Math.ceil(total / limit),
        };
    }

    async toggleCommentLike(commentId: string, userId: string) {
        try {
            const comment = await this.prisma.comment.findUnique({
                where: { id: commentId },
            });

            if (!comment) {
                throw new NotFoundException('Comment not found');
            }

            const existingLike = await this.prisma.like.findUnique({
                where: {
                    userId_targetId_targetType: {
                        userId,
                        targetId: commentId,
                        targetType: 'COMMENT',
                    },
                },
            });

            if (existingLike) {
                // Unlike
                await this.prisma.$transaction([
                    this.prisma.like.delete({
                        where: {
                            userId_targetId_targetType: {
                                userId,
                                targetId: commentId,
                                targetType: 'COMMENT',
                            },
                        },
                    }),
                    this.prisma.comment.update({
                        where: { id: commentId },
                        data: { likesCount: { decrement: 1 } },
                    }),
                    // Remove XP from comment author
                    this.prisma.user.update({
                        where: { id: comment.authorId },
                        data: { points: { decrement: 1 } },
                    }),
                ]);
                
                this.logger.log(`User ${userId} unliked comment ${commentId}, removed 1 XP from author ${comment.authorId}`);
                
                const newCount = Math.max(0, comment.likesCount - 1);
                return { liked: false, likesCount: newCount, xpChange: 0 };
            } else {
                // Like
                await this.prisma.$transaction([
                    this.prisma.like.create({
                        data: {
                            userId,
                            targetId: commentId,
                            targetType: 'COMMENT',
                        },
                    }),
                    this.prisma.comment.update({
                        where: { id: commentId },
                        data: { likesCount: { increment: 1 } },
                    }),
                    // Award XP to comment author (only if not liking own comment)
                    ...(userId !== comment.authorId ? [
                        this.prisma.user.update({
                            where: { id: comment.authorId },
                            data: { points: { increment: 1 } },
                        }),
                        this.prisma.xpLog.create({
                            data: {
                                userId: comment.authorId,
                                type: 'LIKE_RECEIVED',
                                xpAmount: 1,
                                refId: commentId,
                            },
                        }),
                    ] : []),
                ]);
                
                // Send notification for comment like (only if not own comment)
                if (userId !== comment.authorId) {
                    const user = await this.prisma.user.findUnique({
                        where: { id: userId },
                        select: { username: true, displayName: true },
                    });
                    const senderName = user?.displayName || user?.username || 'Someone';

                    await this.notifications.notifyCommentLike(
                        comment.authorId,
                        userId,
                        commentId,
                        comment.postId,
                        senderName,
                    );

                    this.logger.log(`User ${userId} liked comment ${commentId}, awarded 1 XP to author ${comment.authorId}`);
                }
                
                return { 
                    liked: true, 
                    likesCount: comment.likesCount + 1,
                    xpChange: userId !== comment.authorId ? 1 : 0,
                    isOwnComment: userId === comment.authorId
                };
            }
        } catch (error) {
            this.logger.error(`Failed to toggle comment like: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Failed to toggle comment like');
        }
    }
}
