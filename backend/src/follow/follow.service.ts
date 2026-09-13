import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class FollowService {
    constructor(
        private prisma: PrismaService,
        private notifications: NotificationsService,
    ) {}

    async followUser(followerId: string, followingId: string) {
        console.log(`[FollowService] followUser called - followerId: ${followerId}, followingId: ${followingId}`);
        
        if (followerId === followingId) {
            console.log(`[FollowService] Error: User trying to follow themselves`);
            throw new BadRequestException('Cannot follow yourself');
        }

        const targetUser = await this.prisma.user.findUnique({
            where: { id: followingId },
            select: { id: true, username: true, displayName: true },
        });

        if (!targetUser) {
            console.log(`[FollowService] Error: Target user not found`);
            throw new NotFoundException('User not found');
        }

        const existingFollow = await this.prisma.follow.findUnique({
            where: {
                followerId_followingId: {
                    followerId,
                    followingId,
                },
            },
        });

        if (existingFollow) {
            console.log(`[FollowService] Error: Already following this user`);
            throw new BadRequestException('Already following this user');
        }

        await this.prisma.$transaction([
            this.prisma.follow.create({
                data: {
                    followerId,
                    followingId,
                },
            }),
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

        await this.notifications.notifyFollow(
            followingId,
            followerId,
            followerName,
        );

        // Create Activity record
        await this.prisma.activity.create({
            data: {
                userId: followerId,
                type: 'USER_FOLLOWED',
                description: `Followed @${targetUser.username}`,
                xpEarned: 0,
                metadata: { followedUserId: followingId },
            },
        });

        return { success: true, message: 'User followed successfully' };
    }

    async unfollowUser(followerId: string, followingId: string) {
        const existingFollow = await this.prisma.follow.findUnique({
            where: {
                followerId_followingId: {
                    followerId,
                    followingId,
                },
            },
        });

        if (!existingFollow) {
            throw new BadRequestException('Not following this user');
        }

        await this.prisma.$transaction([
            this.prisma.follow.delete({
                where: {
                    followerId_followingId: {
                        followerId,
                        followingId,
                    },
                },
            }),
            this.prisma.user.update({
                where: { id: followerId },
                data: { followingCount: { decrement: 1 } },
            }),
            this.prisma.user.update({
                where: { id: followingId },
                data: { followersCount: { decrement: 1 } },
            }),
        ]);

        return { success: true, message: 'User unfollowed successfully' };
    }

    async isFollowing(followerId: string, followingId: string) {
        const follow = await this.prisma.follow.findUnique({
            where: {
                followerId_followingId: {
                    followerId,
                    followingId,
                },
            },
        });

        return { isFollowing: !!follow };
    }

    async getFollowers(userId: string, page = 1, limit = 20) {
        const skip = (page - 1) * limit;

        const [followers, total] = await Promise.all([
            this.prisma.follow.findMany({
                where: { followingId: userId },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.follow.count({ where: { followingId: userId } }),
        ]);

        const followerIds = followers.map(f => f.followerId);
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
            page,
            lastPage: Math.ceil(total / limit),
        };
    }

    async getFollowing(userId: string, page = 1, limit = 20) {
        const skip = (page - 1) * limit;

        const [following, total] = await Promise.all([
            this.prisma.follow.findMany({
                where: { followerId: userId },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.follow.count({ where: { followerId: userId } }),
        ]);

        const followingIds = following.map(f => f.followingId);
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
            page,
            lastPage: Math.ceil(total / limit),
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

        const currentFollowingIds = new Set(currentUserFollowing.map(f => f.followingId));
        const targetFollowerIds = targetUserFollowers.map(f => f.followerId);

        const mutualIds = targetFollowerIds.filter(id => currentFollowingIds.has(id));

        if (mutualIds.length === 0) {
            return [];
        }

        const mutualUsers = await this.prisma.user.findMany({
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

        return mutualUsers;
    }
}
