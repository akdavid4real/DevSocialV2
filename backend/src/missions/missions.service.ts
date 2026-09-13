import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateMissionDto } from './dto/create-mission.dto';
import { UpdateMissionProgressDto } from './dto/update-mission-progress.dto';

type MissionStep = {
    id: string;
    title?: string;
    description?: string;
    metric?: string;
    target?: number;
};

type StepProgress = {
    stepId: string;
    current: number;
    target: number;
    completed: boolean;
};

@Injectable()
export class MissionsService {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(userId?: string, filters?: { type?: string; difficulty?: string; duration?: string }) {
        const where: any = {
            isActive: true,
            ...(filters?.type ? { type: filters.type.toUpperCase() } : {}),
            ...(filters?.difficulty ? { difficulty: filters.difficulty.toUpperCase() } : {}),
            ...(filters?.duration ? { duration: filters.duration.toUpperCase() } : {}),
        };

        const missions = await this.prisma.mission.findMany({
            where,
            include: userId
                ? {
                    progress: {
                        where: { userId },
                    },
                }
                : undefined,
            orderBy: [{ createdAt: 'desc' }],
        });

        return missions.map((mission: any) => ({
            ...mission,
            userProgress: userId ? mission.progress?.[0] || null : null,
            progress: undefined,
        }));
    }

    async create(user: any, dto: CreateMissionDto) {
        if (!this.isStaffRole(user?.role)) {
            throw new ForbiddenException('Only admins or moderators can create missions');
        }

        const steps = this.normalizeSteps(dto.steps);
        if (steps.length === 0) {
            throw new BadRequestException('Mission must include at least one step');
        }

        return this.prisma.mission.create({
            data: {
                title: dto.title.trim(),
                description: dto.description.trim(),
                type: dto.type as any,
                difficulty: dto.difficulty as any,
                duration: dto.duration as any,
                steps: steps as any,
                rewards: dto.rewards as any,
                prerequisites: dto.prerequisites || [],
                isActive: dto.isActive ?? true,
                createdById: user.id,
            },
        });
    }

    async join(userId: string, missionId: string) {
        const mission = await this.prisma.mission.findUnique({
            where: { id: missionId },
        });

        if (!mission || !mission.isActive) {
            throw new NotFoundException('Mission not found');
        }

        const existing = await this.prisma.missionProgress.findUnique({
            where: { userId_missionId: { userId, missionId } },
        });

        if (existing) {
            throw new BadRequestException('Already joined this mission');
        }

        const steps = this.normalizeSteps(mission.steps as MissionStep[]);
        const progress = steps.map((step) => ({
            stepId: step.id,
            current: 0,
            target: step.target || 1,
            completed: false,
        }));

        return this.prisma.$transaction(async (tx) => {
            const created = await tx.missionProgress.create({
                data: {
                    userId,
                    missionId,
                    progress: progress as any,
                },
                include: { mission: true },
            });

            await tx.mission.update({
                where: { id: missionId },
                data: { participantCount: { increment: 1 } },
            });

            return created;
        });
    }

    async updateProgress(userId: string, missionId: string, dto: UpdateMissionProgressDto) {
        const missionProgress = await this.prisma.missionProgress.findUnique({
            where: { userId_missionId: { userId, missionId } },
            include: { mission: true },
        });

        if (!missionProgress) {
            throw new NotFoundException('Join this mission before updating progress');
        }

        if (missionProgress.status === 'COMPLETED') {
            return missionProgress;
        }

        const missionSteps = this.normalizeSteps(missionProgress.mission.steps as MissionStep[]);
        const progress = this.normalizeProgress(missionProgress.progress, missionSteps);
        const stepIndex = progress.findIndex((step) => step.stepId === dto.stepId);

        if (stepIndex === -1) {
            throw new NotFoundException('Mission step not found');
        }

        const step = progress[stepIndex];
        const nextCurrent = Math.max(step.current, dto.current ?? step.current);
        progress[stepIndex] = {
            ...step,
            current: nextCurrent,
            completed: dto.completed ?? nextCurrent >= step.target,
        };

        const stepsCompleted = progress.filter((item) => item.completed).map((item) => item.stepId);
        const completed = stepsCompleted.length === missionSteps.length;
        const xpEarned = completed ? this.getXpReward(missionProgress.mission.rewards) : missionProgress.xpEarned;

        return this.prisma.$transaction(async (tx) => {
            if (completed) {
                await tx.mission.update({
                    where: { id: missionId },
                    data: { completionCount: { increment: 1 } },
                });

                await tx.user.update({
                    where: { id: userId },
                    data: {
                        points: { increment: xpEarned },
                        badges: this.getBadgeReward(missionProgress.mission.rewards)
                            ? { push: this.getBadgeReward(missionProgress.mission.rewards) as string }
                            : undefined,
                    },
                });

                await tx.xpLog.create({
                    data: {
                        userId,
                        type: 'CHALLENGE_COMPLETION',
                        xpAmount: xpEarned,
                        refId: missionId,
                    },
                });

                await tx.userStats.upsert({
                    where: { userId },
                    create: {
                        userId,
                        totalXP: xpEarned,
                        weeklyXP: xpEarned,
                        monthlyXP: xpEarned,
                    },
                    update: {
                        totalXP: { increment: xpEarned },
                        weeklyXP: { increment: xpEarned },
                        monthlyXP: { increment: xpEarned },
                    },
                });
            }

            return tx.missionProgress.update({
                where: { userId_missionId: { userId, missionId } },
                data: {
                    currentStep: Math.min(stepsCompleted.length, missionSteps.length),
                    stepsCompleted,
                    progress: progress as any,
                    status: completed ? 'COMPLETED' : 'ACTIVE',
                    completedAt: completed ? new Date() : null,
                    xpEarned,
                },
                include: { mission: true },
            });
        });
    }

    async remove(user: any, missionId: string) {
        if (!this.isStaffRole(user?.role)) {
            throw new ForbiddenException('Only admins or moderators can delete missions');
        }

        const mission = await this.prisma.mission.findUnique({
            where: { id: missionId },
            select: { id: true },
        });

        if (!mission) {
            throw new NotFoundException('Mission not found');
        }

        await this.prisma.mission.delete({ where: { id: missionId } });
        return { success: true };
    }

    private normalizeSteps(steps: any): MissionStep[] {
        if (!Array.isArray(steps)) return [];

        return steps.map((step, index) => ({
            id: String(step.id || `step-${index + 1}`),
            title: step.title || `Step ${index + 1}`,
            description: step.description || '',
            metric: step.metric || 'manual',
            target: Number(step.target || 1),
        }));
    }

    private normalizeProgress(progress: any, missionSteps: MissionStep[]): StepProgress[] {
        const existing = Array.isArray(progress) ? progress : [];

        return missionSteps.map((step) => {
            const item = existing.find((entry: any) => entry.stepId === step.id);
            return {
                stepId: step.id,
                current: Number(item?.current || 0),
                target: Number(item?.target || step.target || 1),
                completed: Boolean(item?.completed),
            };
        });
    }

    private getXpReward(rewards: any) {
        const xp = Number(rewards?.xp || 0);
        return Number.isFinite(xp) && xp > 0 ? xp : 100;
    }

    private getBadgeReward(rewards: any) {
        return typeof rewards?.badge === 'string' && rewards.badge.trim() ? rewards.badge.trim() : null;
    }

    private isStaffRole(role?: string) {
        return role === 'ADMIN' || role === 'MODERATOR' || role === 'admin' || role === 'moderator';
    }
}
