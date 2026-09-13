import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';

@Injectable()
export class ReportsService {
    constructor(private readonly prisma: PrismaService) {}

    async create(userId: string, dto: CreateReportDto) {
        const post = await this.prisma.post.findUnique({
            where: { id: dto.postId },
            select: {
                id: true,
                authorId: true,
                status: true,
            },
        });

        if (!post || post.status === 'ARCHIVED') {
            throw new NotFoundException('Post not found');
        }

        if (post.authorId === userId) {
            throw new BadRequestException('You cannot report your own post');
        }

        const existing = await this.prisma.report.findFirst({
            where: {
                reporterId: userId,
                reportedPostId: post.id,
                status: { in: ['PENDING', 'REVIEWED'] as any },
            },
            select: { id: true },
        });

        if (existing) {
            throw new BadRequestException('You have already reported this post');
        }

        return this.prisma.report.create({
            data: {
                reporterId: userId,
                reportedPostId: post.id,
                reportedUserId: post.authorId,
                reason: dto.reason as any,
                description: dto.description?.trim() || null,
            },
        });
    }
}
