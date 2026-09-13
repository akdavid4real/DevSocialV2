import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateKnowledgeEntryDto } from './dto/create-knowledge-entry.dto';

@Injectable()
export class KnowledgeService {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(options: {
        page: number;
        limit: number;
        technology?: string;
        category?: string;
        search?: string;
    }) {
        const page = Math.max(options.page || 1, 1);
        const limit = Math.min(Math.max(options.limit || 20, 1), 50);
        const skip = (page - 1) * limit;
        const category = options.category?.toUpperCase();

        const where: any = {
            ...(options.technology && options.technology !== 'All'
                ? { technology: { equals: options.technology, mode: 'insensitive' } }
                : {}),
            ...(category ? { category } : {}),
            ...(options.search
                ? {
                    OR: [
                        { title: { contains: options.search, mode: 'insensitive' } },
                        { content: { contains: options.search, mode: 'insensitive' } },
                        { tags: { has: options.search } },
                    ],
                }
                : {}),
        };

        const [entries, total] = await Promise.all([
            this.prisma.knowledgeEntry.findMany({
                where,
                orderBy: [{ likesCount: 'desc' }, { createdAt: 'desc' }],
                skip,
                take: limit,
            }),
            this.prisma.knowledgeEntry.count({ where }),
        ]);

        const authorIds = [...new Set(entries.map((entry) => entry.authorId))];
        const authors = await this.prisma.user.findMany({
            where: { id: { in: authorIds } },
            select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
                level: true,
            },
        });
        const authorMap = new Map(authors.map((author) => [author.id, author]));

        return {
            entries: entries.map((entry) => ({
                ...entry,
                author: authorMap.get(entry.authorId) || null,
            })),
            total,
            page,
            lastPage: Math.ceil(total / limit),
        };
    }

    async create(userId: string, dto: CreateKnowledgeEntryDto) {
        const entry = await this.prisma.knowledgeEntry.create({
            data: {
                title: dto.title.trim(),
                technology: dto.technology.trim(),
                category: dto.category as any,
                content: dto.content.trim(),
                codeExample: dto.codeExample?.trim() || undefined,
                tags: dto.tags || [],
                authorId: userId,
            },
        });

        const author = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
                level: true,
            },
        });

        return { ...entry, author };
    }

    async findOne(id: string) {
        const entry = await this.prisma.knowledgeEntry.findUnique({
            where: { id },
        });

        if (!entry) {
            throw new NotFoundException('Knowledge entry not found');
        }

        const author = await this.prisma.user.findUnique({
            where: { id: entry.authorId },
            select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
                level: true,
            },
        });

        return { ...entry, author };
    }
}
