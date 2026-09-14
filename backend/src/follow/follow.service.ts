import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class FollowService {
    constructor(
        private prisma: PrismaService,
        private notifications: NotificationsService,
    ) {}

    async followUser(followerId: string, followingId: string) {
        if (followerId === followingId) {
            throw new BadRequestException('Cannot follow yourself');
        }

        const [targetUser, block] = await Promise.all([
            this.prisma.user.findUnique({
                where: { id: followingId },
                select: { id: true, username: true, displayName: true, privacySettings: true },
            }),
            this.prisma.block.findFirst({
                where: {
                    OR: [
                        { blockerId: followerId, blockedId: followingId },
                        { blockerId: followingId, blockedId: followerId },
                    ],
                },
                select: { id: true },
            }),
        ]);

        if (!targetUser) throw new NotFoundException('User not found');
        if (block) throw new ForbiddenException('Following is not available between these users');

        const privacy = targetUser.privacySettings && typeof targetUser.privacySettings === 'object' && !Array.isArray(targetUser.privacySettings)
            ? targetUser.privacySettings as Record<string, unknown>
            : {};
        if (String(privacy.profileVisibility || 'PUBLIC').toUpperCase() === 'PRIVATE') {
            throw new ForbiddenException('This profile is private and requires an approved follow request');
        }

        const existingFollow = await this.prisma.follow.findUnique({
            where: {
                followerId_followingId: { followerId, followingId },
            },
        });
        if (existingFollow) throw new BadRequestException('Already following this user');

        await this.prisma.$transaction([
            this.prisma.follow.create({ data: { followerId, followingId } }),
            this.prisma.user.update({
                where: { id: followerId },
                data: { followingCount: { increment: 1 } },
            }),
            this.prisma.user.update({
                where: { id: followingId },
                data: { followersCount: { increment: 1 } },
            }),
        ]);

        const follower = await this.prisma.user.findUnique({
            where: { id: followerId },
            select: { username: true, displayName: true },
        });
        const followerName = follower?.displayName || follower?.username || 'Someone';

        await Promise.allSettled([
            this.notifications.notifyFollow(followingId, followerId, followerName),
            this.prisma.activity.create({
                data: {
                    userId: followerId,
                    type: 'USER_FOLLOWED',
                    description: `Followed @${targetUser.username}`,
                    xpEarned: 0,
                    metadata: { followedUserId: followingId },
                },
            }),
        ]);

        return { success: true, message: 'User followed successfully' };
    }

    async unfollowUser(followerId: string, followingId: string) {
        const existingFollow = await this.prisma.follow.findUnique({
            where: {
                followerId_followingId: { followerId, followingId },
            },
        });
        if (!existingFollow) throw new BadRequestException('Not following this user');

        await this.prisma.$transaction([
            this.prisma.follow.delete({
                where: { followerId_followingId: { followerId, followingId } },
            }),
            this.prisma.user.updateMany({
                where: { id: followerId, followingCount: { gt: 0 } },
                data: { followingCount: { decrement: 1 } },
            }),
            this.prisma.user.updateMany({
                where: { id: followingId, followersCount: { gt: 0 } },
                data: { followersCount: { decrement: 1 } },
            }),
        ]);

        return { success: true, message: 'User unfollowed successfully' };
    }

    async isFollowing(followerId: string, followingId: string) {
        const [follow, block] = await Promise.all([
            this.prisma.follow.findUnique({
                where: { followerId_followingId: { followerId, followingId } },
            }),
            this.prisma.block.findFirst({
                where: {
                    OR: [
                        { blockerId: followerId, blockedId: followingId },
                        { blockerId: followingId, blockedId: followerId },
                    ],
                },
                select: { id: true },
            }),
        ]);
        return { isFollowing: !!follow && !block };
    }

    async getFollowers(userId: string, page = 1, limit = 20) {
        const safePage = Math.max(page || 1, 1);
        const safeLimit = Math.min(Math.max(limit || 20, 1), 100);
        const skip = (safePage - 1) * safeLimit;

        const [followers, total] = await Promise.all([
            this.prisma.follow.findMany({
                where: { followingId: userId },
                skip,
                take: safeLimit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.follow.count({ where: { followingId: userId } }),
        ]);

        const followerIds = followers.map((follow) => follow.followerId);
        const users = await this.prisma.user.findMany({
            where: { id: { in: followerIds } },
            select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
                level: true,
                followersCount: true,
            },
        });

        return {
            followers: users,
            total,
            page: safePage,
            lastPage: Math.ceil(total / safeLimit),
        };
    }

    async getFollowing(userId: string, page = 1, limit = 20) {
        const safePage = Math.max(page || 1, 1);
        const safeLimit = Math.min(Math.max(limit || 20, 1), 100);
        const skip = (safePage - 1) * safeLimit;

        const [following, total] = await Promise.all([
            this.prisma.follow.findMany({
                where: { followerId: userId },
                skip,
                take: safeLimit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.follow.count({ where: { followerId: userId } }),
        ]);

        const followingIds = following.map((follow) => follow.followingId);
        const users = await this.prisma.user.findMany({
            where: { id: { in: followingIds } },
            select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
                level: true,
                followersCount: true,
            },
        });

        return {
            following: users,
            total,
            page: safePage,
            lastPage: Math.ceil(total / safeLimit),
        };
    }

    async getMutualFollowers(currentUserId: string, targetUserId: string) {
        const [currentUserFollowing, targetUserFollowers] = await Promise.all([
            this.prisma.follow.findMany({
                where: { followerId: currentUserId },
                select: { followingId: true },
            }),
            this.prisma.follow.findMany({
                where: { followingId: targetUserId },
                select: { followerId: true },
            }),
        ]);

        const currentFollowingIds = new Set(currentUserFollowing.map((follow) => follow.followingId));
        const mutualIds = targetUserFollowers
            .map((follow) => follow.followerId)
            .filter((id) => currentFollowingIds.has(id));

        if (mutualIds.length === 0) return [];

        return this.prisma.user.findMany({
            where: { id: { in: mutualIds } },
            select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
                level: true,
            },
            take: 10,
        });
    }
}
