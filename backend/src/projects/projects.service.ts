import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';

@Injectable()
export class ProjectsService {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(options: {
        page: number;
        limit: number;
        search?: string;
        status?: string;
        tech?: string;
    }) {
        const page = Math.max(options.page || 1, 1);
        const limit = Math.min(Math.max(options.limit || 12, 1), 50);
        const skip = (page - 1) * limit;

        const where: any = {
            visibility: 'PUBLIC',
            ...(options.status ? { status: options.status.toUpperCase() } : {}),
            ...(options.tech ? { technologies: { has: options.tech } } : {}),
            ...(options.search
                ? {
                    OR: [
                        { title: { contains: options.search, mode: 'insensitive' } },
                        { description: { contains: options.search, mode: 'insensitive' } },
                    ],
                }
                : {}),
        };

        const [projects, total] = await Promise.all([
            this.prisma.project.findMany({
                where,
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
                orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
                skip,
                take: limit,
            }),
            this.prisma.project.count({ where }),
        ]);

        return {
            projects,
            total,
            page,
            lastPage: Math.ceil(total / limit),
        };
    }

    async findMine(userId: string, options: { page: number; limit: number; status?: string }) {
        const page = Math.max(options.page || 1, 1);
        const limit = Math.min(Math.max(options.limit || 24, 1), 50);
        const skip = (page - 1) * limit;
        const where: any = {
            authorId: userId,
            ...(options.status ? { status: options.status.toUpperCase() } : {}),
        };

        const [projects, total, byStatus, totals] = await Promise.all([
            this.prisma.project.findMany({
                where,
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
                orderBy: { updatedAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.project.count({ where }),
            this.prisma.project.groupBy({
                by: ['status'],
                where: { authorId: userId },
                _count: { status: true },
            }),
            this.prisma.project.aggregate({
                where: { authorId: userId },
                _sum: { views: true },
            }),
        ]);

        return {
            projects,
            total,
            page,
            lastPage: Math.ceil(total / limit),
            stats: {
                totalViews: totals._sum.views || 0,
                byStatus: byStatus.reduce<Record<string, number>>((acc, item) => {
                    acc[item.status] = item._count.status;
                    return acc;
                }, {}),
            },
        };
    }

    async create(userId: string, dto: CreateProjectDto) {
        return this.prisma.project.create({
            data: {
                title: dto.title.trim(),
                description: dto.description.trim(),
                authorId: userId,
                technologies: dto.technologies || [],
                githubUrl: dto.githubUrl,
                liveUrl: dto.liveUrl,
                images: dto.images || [],
                openPositions: dto.openPositions || [],
                status: (dto.status as any) || 'IN_PROGRESS',
                visibility: (dto.visibility as any) || 'PUBLIC',
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
    }

    async findOne(id: string) {
        const project = await this.prisma.project.update({
            where: { id },
            data: { views: { increment: 1 } },
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
        }).catch(() => null);

        if (!project || project.visibility !== 'PUBLIC') {
            throw new NotFoundException('Project not found');
        }

        return project;
    }

    async updateStatus(userId: string, id: string, status: string) {
        const project = await this.prisma.project.findUnique({
            where: { id },
            select: { authorId: true },
        });

        if (!project) {
            throw new NotFoundException('Project not found');
        }

        if (project.authorId !== userId) {
            throw new ForbiddenException('Only the project owner can update status');
        }

        return this.prisma.project.update({
            where: { id },
            data: { status: status as any },
        });
    }

    async remove(userId: string, id: string) {
        const project = await this.prisma.project.findUnique({
            where: { id },
            select: { authorId: true },
        });

        if (!project) {
            throw new NotFoundException('Project not found');
        }

        if (project.authorId !== userId) {
            throw new ForbiddenException('Only the project owner can delete this project');
        }

        await this.prisma.project.delete({ where: { id } });
        return { success: true, message: 'Project deleted successfully' };
    }
}
