import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateChallengeDto } from './dto/create-challenge.dto';
import { SubmitChallengeProgressDto } from './dto/submit-challenge-progress.dto';

@Injectable()
export class ChallengesService {
    constructor(private readonly prisma: PrismaService) {}

    async findActive(userId?: string) {
        const now = new Date();
        const challenges = await this.prisma.weeklyChallenge.findMany({
            where: {
                isActive: true,
                startDate: { lte: now },
                endDate: { gte: now },
            },
            include: userId
                ? {
                    participations: {
                        where: { userId },
                    },
                }
                : undefined,
            orderBy: [{ endDate: 'asc' }, { createdAt: 'desc' }],
        });

        return challenges.map((challenge: any) => ({
            ...challenge,
            participation: userId ? challenge.participations?.[0] || null : null,
            participations: undefined,
        }));
    }

    async findUserChallenges(userId: string) {
        return this.prisma.challengeParticipation.findMany({
            where: { userId },
            include: {
                challenge: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async create(user: any, dto: CreateChallengeDto) {
        if (!this.isStaffRole(user?.role)) {
            throw new ForbiddenException('Only admins or moderators can create challenges');
        }

        const startDate = new Date(dto.startDate);
        const endDate = new Date(dto.endDate);

        if (endDate <= startDate) {
            throw new BadRequestException('Challenge end date must be after start date');
        }

        return this.prisma.weeklyChallenge.create({
            data: {
                title: dto.title.trim(),
                description: dto.description.trim(),
                type: dto.type as any,
                difficulty: dto.difficulty as any,
                requirements: dto.requirements,
                rewards: dto.rewards,
                startDate,
                endDate,
                firstCompletionBonus: dto.firstCompletionBonus ?? 10,
                isActive: dto.isActive ?? true,
                createdById: user.id,
            },
        });
    }

    async join(userId: string, challengeId: string) {
        const challenge = await this.prisma.weeklyChallenge.findUnique({
            where: { id: challengeId },
            select: { id: true, isActive: true, startDate: true, endDate: true },
        });

        if (!challenge || !this.isChallengeJoinable(challenge)) {
            throw new NotFoundException('Challenge not found or inactive');
        }

        const existing = await this.prisma.challengeParticipation.findUnique({
            where: { userId_challengeId: { userId, challengeId } },
        });

        if (existing) {
            throw new BadRequestException('Already participating in this challenge');
        }

        return this.prisma.$transaction(async (tx) => {
            const participation = await tx.challengeParticipation.create({
                data: {
                    userId,
                    challengeId,
                },
                include: { challenge: true },
            });

            await tx.weeklyChallenge.update({
                where: { id: challengeId },
                data: { participantCount: { increment: 1 } },
            });

            await tx.xpLog.create({
                data: {
                    userId,
                    type: 'DAILY_CHALLENGE',
                    xpAmount: 50,
                    refId: challengeId,
                },
            });

            await tx.user.update({
                where: { id: userId },
                data: { points: { increment: 50 } },
            });

            return participation;
        });
    }

    async submitProgress(userId: string, challengeId: string, dto: SubmitChallengeProgressDto) {
        const participation = await this.prisma.challengeParticipation.findUnique({
            where: { userId_challengeId: { userId, challengeId } },
            include: { challenge: true },
        });

        if (!participation) {
            throw new NotFoundException('Join the challenge before submitting progress');
        }

        if (participation.status === 'COMPLETED') {
            return participation;
        }

        const progress = Math.max(participation.progress, dto.progress);
        const completed = progress >= 100;
        const reward = this.getXpReward(participation.challenge.rewards);

        return this.prisma.$transaction(async (tx) => {
            let xpEarned = participation.xpEarned;
            let isFirstCompletion = participation.isFirstCompletion;

            if (completed) {
                const completionCount = await tx.challengeParticipation.count({
                    where: {
                        challengeId,
                        status: 'COMPLETED',
                    },
                });

                isFirstCompletion = completionCount === 0;
                xpEarned = reward + (isFirstCompletion ? participation.challenge.firstCompletionBonus : 0);

                await tx.weeklyChallenge.update({
                    where: { id: challengeId },
                    data: { completionCount: { increment: 1 } },
                });

                await tx.user.update({
                    where: { id: userId },
                    data: { points: { increment: xpEarned } },
                });

                await tx.xpLog.create({
                    data: {
                        userId,
                        type: 'CHALLENGE_COMPLETION',
                        xpAmount: xpEarned,
                        refId: challengeId,
                    },
                });

                await tx.userStats.upsert({
                    where: { userId },
                    create: {
                        userId,
                        totalXP: xpEarned,
                        weeklyXP: xpEarned,
                        monthlyXP: xpEarned,
                        challengesCompleted: 1,
                    },
                    update: {
                        totalXP: { increment: xpEarned },
                        weeklyXP: { increment: xpEarned },
                        monthlyXP: { increment: xpEarned },
                        challengesCompleted: { increment: 1 },
                    },
                });
            }

            return tx.challengeParticipation.update({
                where: { userId_challengeId: { userId, challengeId } },
                data: {
                    progress,
                    submissionData: (dto.submissionData || participation.submissionData || undefined) as any,
                    status: completed ? 'COMPLETED' : 'ACTIVE',
                    completedAt: completed ? new Date() : null,
                    xpEarned,
                    isFirstCompletion,
                },
                include: { challenge: true },
            });
        });
    }

    async getLeaderboard(challengeId: string) {
        const challenge = await this.prisma.weeklyChallenge.findUnique({
            where: { id: challengeId },
            select: { id: true },
        });

        if (!challenge) {
            throw new NotFoundException('Challenge not found');
        }

        const participations = await this.prisma.challengeParticipation.findMany({
            where: { challengeId },
            orderBy: [{ progress: 'desc' }, { updatedAt: 'asc' }],
            take: 25,
        });

        const users = await this.prisma.user.findMany({
            where: { id: { in: participations.map((item) => item.userId) } },
            select: { id: true, username: true, displayName: true, avatar: true, level: true },
        });
        const usersById = new Map(users.map((user) => [user.id, user]));

        return participations.map((item, index) => ({
            ...item,
            rank: index + 1,
            user: usersById.get(item.userId) || null,
        }));
    }

    private isChallengeJoinable(challenge: { isActive: boolean; startDate: Date; endDate: Date }) {
        const now = new Date();
        return challenge.isActive && challenge.startDate <= now && challenge.endDate >= now;
    }

    private getXpReward(rewards: any) {
        const xp = Number(rewards?.xp || 0);
        return Number.isFinite(xp) && xp > 0 ? xp : 100;
    }

    private isStaffRole(role?: string) {
        return role === 'ADMIN' || role === 'MODERATOR' || role === 'admin' || role === 'moderator';
    }
}
