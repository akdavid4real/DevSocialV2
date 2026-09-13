import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateFeedbackCommentDto } from './dto/create-feedback-comment.dto';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

const USER_SELECT = {
    id: true,
    username: true,
    displayName: true,
    avatar: true,
    role: true,
    level: true,
};

@Injectable()
export class FeedbackService {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(options: {
        page: number;
        limit: number;
        search?: string;
        status?: string;
        type?: string;
        userId?: string;
    }) {
        const page = Math.max(options.page || 1, 1);
        const limit = Math.min(Math.max(options.limit || 20, 1), 50);
        const skip = (page - 1) * limit;

        const where: any = {
            ...(options.userId ? { userId: options.userId } : {}),
            ...(options.status ? { status: options.status.toUpperCase() } : {}),
            ...(options.type ? { type: options.type.toUpperCase() } : {}),
            ...(options.search
                ? {
                    OR: [
                        { subject: { contains: options.search, mode: 'insensitive' } },
                        { description: { contains: options.search, mode: 'insensitive' } },
                    ],
                }
                : {}),
        };

        const [feedback, total] = await Promise.all([
            this.prisma.feedback.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.feedback.count({ where }),
        ]);

        return {
            feedback: await this.attachUsers(feedback),
            total,
            page,
            lastPage: Math.ceil(total / limit),
        };
    }

    async create(userId: string, dto: CreateFeedbackDto) {
        const feedback = await this.prisma.feedback.create({
            data: {
                userId,
                type: dto.type as any,
                subject: dto.subject.trim(),
                description: dto.description.trim(),
                rating: dto.rating,
            },
        });

        return (await this.attachUsers([feedback]))[0];
    }

    async findOne(userId: string, id: string) {
        const feedback = await this.prisma.feedback.findUnique({
            where: { id },
            include: {
                comments: {
                    orderBy: { createdAt: 'asc' },
                },
            },
        });

        if (!feedback) {
            throw new NotFoundException('Feedback not found');
        }

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, role: true },
        });

        if (!this.canAccessFeedback(feedback.userId, userId, user?.role)) {
            throw new ForbiddenException('You can only view your own feedback');
        }

        return this.attachFeedbackUsers(feedback);
    }

    async createComment(userId: string, id: string, dto: CreateFeedbackCommentDto) {
        const feedback = await this.prisma.feedback.findUnique({
            where: { id },
            select: { id: true, userId: true },
        });

        if (!feedback) {
            throw new NotFoundException('Feedback not found');
        }

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, role: true },
        });

        if (!this.canAccessFeedback(feedback.userId, userId, user?.role)) {
            throw new ForbiddenException('You can only comment on your own feedback');
        }

        const isAdminComment = this.isStaffRole(user?.role);
        const comment = await this.prisma.$transaction(async (tx) => {
            const created = await tx.feedbackComment.create({
                data: {
                    feedbackId: id,
                    userId,
                    content: dto.content.trim(),
                    isAdminComment,
                },
            });

            await tx.feedback.update({
                where: { id },
                data: { commentsCount: { increment: 1 } },
            });

            return created;
        });

        return (await this.attachCommentUsers([comment]))[0];
    }

    async updateStatus(userId: string, id: string, status: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, role: true },
        });

        if (!this.isStaffRole(user?.role)) {
            throw new ForbiddenException('Only admins or moderators can update feedback status');
        }

        const feedback = await this.prisma.feedback.findUnique({
            where: { id },
            select: { id: true },
        });

        if (!feedback) {
            throw new NotFoundException('Feedback not found');
        }

        const updated = await this.prisma.feedback.update({
            where: { id },
            data: {
                status: status as any,
                solvedById: status === 'SOLVED' ? userId : null,
                solvedAt: status === 'SOLVED' ? new Date() : null,
            },
        });

        return (await this.attachUsers([updated]))[0];
    }

    private async attachFeedbackUsers(feedback: any) {
        const [enrichedFeedback] = await this.attachUsers([feedback]);
        return {
            ...enrichedFeedback,
            comments: await this.attachCommentUsers(feedback.comments || []),
        };
    }

    private async attachUsers(feedback: any[]) {
        const userIds = Array.from(new Set(feedback.flatMap((item) => [item.userId, item.solvedById]).filter(Boolean)));
        const users = await this.findUsersById(userIds);

        return feedback.map((item) => ({
            ...item,
            user: users.get(item.userId) || null,
            solvedBy: item.solvedById ? users.get(item.solvedById) || null : null,
        }));
    }

    private async attachCommentUsers(comments: any[]) {
        const userIds = Array.from(new Set(comments.map((comment) => comment.userId).filter(Boolean)));
        const users = await this.findUsersById(userIds);

        return comments.map((comment) => ({
            ...comment,
            user: users.get(comment.userId) || null,
        }));
    }

    private async findUsersById(userIds: string[]) {
        const users = userIds.length
            ? await this.prisma.user.findMany({
                where: { id: { in: userIds } },
                select: USER_SELECT,
            })
            : [];

        return new Map(users.map((user) => [user.id, user]));
    }

    private canAccessFeedback(ownerId: string, userId: string, role?: string) {
        return ownerId === userId || this.isStaffRole(role);
    }

    private isStaffRole(role?: string) {
        return role === 'ADMIN' || role === 'MODERATOR' || role === 'admin' || role === 'moderator';
    }
}
