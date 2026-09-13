import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

const USER_SELECT = {
    id: true,
    username: true,
    displayName: true,
    avatar: true,
    level: true,
};

@Injectable()
export class ReferralsService {
    constructor(private readonly prisma: PrismaService) {}

    async getOrCreateReferralCode(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, username: true, referralCode: true },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        if (user.referralCode) {
            return { referralCode: user.referralCode };
        }

        const referralCode = await this.generateUniqueCode(user.username);
        const updated = await this.prisma.user.update({
            where: { id: userId },
            data: { referralCode },
            select: { referralCode: true },
        });

        return { referralCode: updated.referralCode };
    }

    async validateReferralCode(referralCode: string) {
        const referrer = await this.findReferrer(referralCode);
        return {
            valid: Boolean(referrer),
            referrer,
        };
    }

    async createCompletedReferral(referralCode: string, referredId: string) {
        const referrer = await this.findReferrer(referralCode);

        if (!referrer) {
            throw new BadRequestException('Invalid referral code');
        }

        if (referrer.id === referredId) {
            throw new BadRequestException('Cannot refer yourself');
        }

        const existing = await this.prisma.referral.findFirst({
            where: {
                OR: [
                    { referredId },
                    { referrerId: referrer.id, referredId },
                ],
            },
        });

        if (existing) {
            return existing;
        }

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        const uniqueReferralCode = `${referralCode.trim()}-${referredId.slice(0, 8)}`;

        return this.prisma.$transaction(async (tx) => {
            const referral = await tx.referral.create({
                data: {
                    referrerId: referrer.id,
                    referredId,
                    referralCode: uniqueReferralCode,
                    status: 'COMPLETED',
                    expiresAt,
                    completedAt: new Date(),
                    rewardsClaimed: true,
                    referrerReward: 25,
                    referredReward: 15,
                },
            });

            await tx.user.update({
                where: { id: referrer.id },
                data: { points: { increment: 25 } },
            });

            await tx.user.update({
                where: { id: referredId },
                data: { points: { increment: 15 } },
            });

            await tx.xpLog.createMany({
                data: [
                    {
                        userId: referrer.id,
                        type: 'REFERRAL_SUCCESS',
                        xpAmount: 25,
                        refId: referral.id,
                    },
                    {
                        userId: referredId,
                        type: 'REFERRAL_BONUS',
                        xpAmount: 15,
                        refId: referral.id,
                    },
                ],
            });

            await tx.userStats.upsert({
                where: { userId: referrer.id },
                create: {
                    userId: referrer.id,
                    totalXP: 25,
                    weeklyXP: 25,
                    monthlyXP: 25,
                    totalReferrals: 1,
                },
                update: {
                    totalXP: { increment: 25 },
                    weeklyXP: { increment: 25 },
                    monthlyXP: { increment: 25 },
                    totalReferrals: { increment: 1 },
                },
            });

            await tx.userStats.upsert({
                where: { userId: referredId },
                create: {
                    userId: referredId,
                    totalXP: 15,
                    weeklyXP: 15,
                    monthlyXP: 15,
                },
                update: {
                    totalXP: { increment: 15 },
                    weeklyXP: { increment: 15 },
                    monthlyXP: { increment: 15 },
                },
            });

            return referral;
        });
    }

    async getStats(userId: string) {
        await this.expireOldReferrals();

        const [summary, recentReferrals] = await Promise.all([
            this.prisma.referral.groupBy({
                by: ['status'],
                where: { referrerId: userId },
                _count: { id: true },
                _sum: { referrerReward: true },
            }),
            this.prisma.referral.findMany({
                where: { referrerId: userId },
                orderBy: { createdAt: 'desc' },
                take: 10,
            }),
        ]);

        const referredUsers = await this.prisma.user.findMany({
            where: { id: { in: recentReferrals.map((referral) => referral.referredId) } },
            select: USER_SELECT,
        });
        const usersById = new Map(referredUsers.map((user) => [user.id, user]));

        const stats = {
            pending: { count: 0, rewards: 0 },
            completed: { count: 0, rewards: 0 },
            expired: { count: 0, rewards: 0 },
            total: { count: 0, rewards: 0 },
        };

        for (const item of summary) {
            const key = item.status.toLowerCase() as 'pending' | 'completed' | 'expired';
            const count = item._count.id;
            const rewards = item._sum.referrerReward || 0;
            stats[key] = { count, rewards };
            stats.total.count += count;
            stats.total.rewards += rewards;
        }

        return {
            stats,
            recentReferrals: recentReferrals.map((referral) => ({
                ...referral,
                referred: usersById.get(referral.referredId) || null,
            })),
        };
    }

    async expireOldReferrals() {
        return this.prisma.referral.updateMany({
            where: {
                status: 'PENDING',
                expiresAt: { lt: new Date() },
            },
            data: { status: 'EXPIRED' },
        });
    }

    private async findReferrer(referralCode: string) {
        return this.prisma.user.findUnique({
            where: { referralCode: referralCode.trim() },
            select: USER_SELECT,
        });
    }

    private async generateUniqueCode(username: string) {
        const base = username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16) || 'dev';

        for (let index = 0; index < 5; index += 1) {
            const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
            const code = `${base}${suffix}`;
            const existing = await this.prisma.user.findUnique({
                where: { referralCode: code },
                select: { id: true },
            });

            if (!existing) {
                return code;
            }
        }

        return `${base}${Date.now().toString(36).toUpperCase()}`;
    }
}
