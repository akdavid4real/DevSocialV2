import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

type FollowRequestRow = {
    id: string;
    requester_id: string;
    target_id: string;
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
    created_at: Date;
    updated_at: Date;
    responded_at: Date | null;
};

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

        const [targetUser, block, existingFollow] = await Promise.all([
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
            this.prisma.follow.findUnique({
                where: { followerId_followingId: { followerId, followingId } },
                select: { id: true },
            }),
        ]);

        if (!targetUser) throw new NotFoundException('User not found');
        if (block) throw new ForbiddenException('Following is not available between these users');
        if (existingFollow) throw new BadRequestException('Already following this user');

        const privacy = this.normalizeObject(targetUser.privacySettings);
        if (String(privacy.profileVisibility || 'PUBLIC').toUpperCase() === 'PRIVATE') {
            return this.requestPrivateFollow(followerId, targetUser);
        }

        await this.createFollow(followerId, followingId);
        await this.emitFollowSideEffects(followerId, targetUser);

        return { success: true, following: true, requested: false, message: 'User followed successfully' };
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

        return { success: true, following: false, requested: false, message: 'User unfollowed successfully' };
    }

    async isFollowing(followerId: string, followingId: string) {
        const [follow, block, requests] = await Promise.all([
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
            this.prisma.$queryRaw<FollowRequestRow[]>`
                SELECT id, requester_id, target_id, status, created_at, updated_at, responded_at
                FROM public.follow_requests
                WHERE requester_id = ${followerId}::uuid
                  AND target_id = ${followingId}::uuid
                LIMIT 1
            `,
        ]);

        const request = requests[0];
        return {
            isFollowing: !!follow && !block,
            requestId: request?.status === 'PENDING' ? request.id : null,
            requestStatus: request?.status || null,
        };
    }

    async getIncomingRequests(userId: string, page = 1, limit = 20) {
        const safePage = Math.max(page || 1, 1);
        const safeLimit = Math.min(Math.max(limit || 20, 1), 100);
        const offset = (safePage - 1) * safeLimit;

        const [requests, countRows] = await Promise.all([
            this.prisma.$queryRaw<Array<FollowRequestRow & {
                username: string;
                display_name: string | null;
                avatar: string;
                level: number;
            }>>`
                SELECT fr.id, fr.requester_id, fr.target_id, fr.status, fr.created_at, fr.updated_at, fr.responded_at,
                       u.username, u."displayName" AS display_name, u.avatar, u.level
                FROM public.follow_requests fr
                JOIN public."User" u ON u.id = fr.requester_id
                WHERE fr.target_id = ${userId}::uuid AND fr.status = 'PENDING'
                ORDER BY fr.created_at DESC
                LIMIT ${safeLimit} OFFSET ${offset}
            `,
            this.prisma.$queryRaw<Array<{ count: bigint }>>`
                SELECT COUNT(*)::bigint AS count
                FROM public.follow_requests
                WHERE target_id = ${userId}::uuid AND status = 'PENDING'
            `,
        ]);

        const total = Number(countRows[0]?.count || 0);
        return {
            requests: requests.map((request) => ({
                id: request.id,
                status: request.status,
                createdAt: request.created_at,
                user: {
                    id: request.requester_id,
                    username: request.username,
                    displayName: request.display_name,
                    avatar: request.avatar,
                    level: request.level,
                },
            })),
            total,
            page: safePage,
            lastPage: Math.ceil(total / safeLimit),
        };
    }

    async getOutgoingRequests(userId: string, page = 1, limit = 20) {
        const safePage = Math.max(page || 1, 1);
        const safeLimit = Math.min(Math.max(limit || 20, 1), 100);
        const offset = (safePage - 1) * safeLimit;

        const [requests, countRows] = await Promise.all([
            this.prisma.$queryRaw<Array<FollowRequestRow & {
                username: string;
                display_name: string | null;
                avatar: string;
                level: number;
            }>>`
                SELECT fr.id, fr.requester_id, fr.target_id, fr.status, fr.created_at, fr.updated_at, fr.responded_at,
                       u.username, u."displayName" AS display_name, u.avatar, u.level
                FROM public.follow_requests fr
                JOIN public."User" u ON u.id = fr.target_id
                WHERE fr.requester_id = ${userId}::uuid AND fr.status = 'PENDING'
                ORDER BY fr.created_at DESC
                LIMIT ${safeLimit} OFFSET ${offset}
            `,
            this.prisma.$queryRaw<Array<{ count: bigint }>>`
                SELECT COUNT(*)::bigint AS count
                FROM public.follow_requests
                WHERE requester_id = ${userId}::uuid AND status = 'PENDING'
            `,
        ]);

        const total = Number(countRows[0]?.count || 0);
        return {
            requests: requests.map((request) => ({
                id: request.id,
                status: request.status,
                createdAt: request.created_at,
                user: {
                    id: request.target_id,
                    username: request.username,
                    displayName: request.display_name,
                    avatar: request.avatar,
                    level: request.level,
                },
            })),
            total,
            page: safePage,
            lastPage: Math.ceil(total / safeLimit),
        };
    }

    async acceptFollowRequest(targetId: string, requestId: string) {
        const result = await this.prisma.$transaction(async (tx) => {
            const rows = await tx.$queryRaw<FollowRequestRow[]>`
                SELECT id, requester_id, target_id, status, created_at, updated_at, responded_at
                FROM public.follow_requests
                WHERE id = ${requestId}::uuid
                FOR UPDATE
            `;
            const request = rows[0];
            if (!request || request.target_id !== targetId || request.status !== 'PENDING') {
                throw new NotFoundException('Follow request not found');
            }

            const block = await tx.block.findFirst({
                where: {
                    OR: [
                        { blockerId: request.requester_id, blockedId: targetId },
                        { blockerId: targetId, blockedId: request.requester_id },
                    ],
                },
                select: { id: true },
            });
            if (block) throw new ForbiddenException('Following is not available between these users');

            const existing = await tx.follow.findUnique({
                where: {
                    followerId_followingId: {
                        followerId: request.requester_id,
                        followingId: targetId,
                    },
                },
                select: { id: true },
            });

            if (!existing) {
                await tx.follow.create({
                    data: { followerId: request.requester_id, followingId: targetId },
                });
                await tx.user.update({
                    where: { id: request.requester_id },
                    data: { followingCount: { increment: 1 } },
                });
                await tx.user.update({
                    where: { id: targetId },
                    data: { followersCount: { increment: 1 } },
                });
            }

            await tx.$executeRaw`
                UPDATE public.follow_requests
                SET status = 'ACCEPTED', responded_at = now()
                WHERE id = ${requestId}::uuid
            `;

            return request.requester_id;
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

        const [requester, target] = await Promise.all([
            this.prisma.user.findUnique({
                where: { id: result },
                select: { username: true, displayName: true },
            }),
            this.prisma.user.findUnique({
                where: { id: targetId },
                select: { username: true, displayName: true },
            }),
        ]);

        await Promise.allSettled([
            this.notifications.notifyFollow(
                targetId,
                result,
                requester?.displayName || requester?.username || 'Someone',
            ),
            this.notifications.createNotification({
                recipientId: result,
                senderId: targetId,
                type: 'SYSTEM',
                title: 'Follow request accepted',
                message: `${target?.displayName || target?.username || 'A user'} accepted your follow request`,
                relatedId: targetId,
                relatedType: 'user',
                actionUrl: target?.username ? `/@${target.username}` : undefined,
            }),
        ]);

        return { success: true, following: true, requestStatus: 'ACCEPTED' };
    }

    async rejectFollowRequest(targetId: string, requestId: string) {
        const changed = await this.prisma.$executeRaw`
            UPDATE public.follow_requests
            SET status = 'REJECTED', responded_at = now()
            WHERE id = ${requestId}::uuid
              AND target_id = ${targetId}::uuid
              AND status = 'PENDING'
        `;
        if (!changed) throw new NotFoundException('Follow request not found');
        return { success: true, requestStatus: 'REJECTED' };
    }

    async cancelFollowRequest(requesterId: string, requestId: string) {
        const changed = await this.prisma.$executeRaw`
            UPDATE public.follow_requests
            SET status = 'CANCELLED', responded_at = now()
            WHERE id = ${requestId}::uuid
              AND requester_id = ${requesterId}::uuid
              AND status = 'PENDING'
        `;
        if (!changed) throw new NotFoundException('Follow request not found');
        return { success: true, requestStatus: 'CANCELLED' };
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

    private async requestPrivateFollow(
        requesterId: string,
        target: { id: string; username: string; displayName: string | null },
    ) {
        const rows = await this.prisma.$queryRaw<FollowRequestRow[]>`
            INSERT INTO public.follow_requests (requester_id, target_id, status, responded_at, created_at)
            VALUES (${requesterId}::uuid, ${target.id}::uuid, 'PENDING', NULL, now())
            ON CONFLICT (requester_id, target_id)
            DO UPDATE SET
                status = 'PENDING',
                responded_at = NULL,
                created_at = CASE
                    WHEN public.follow_requests.status = 'PENDING' THEN public.follow_requests.created_at
                    ELSE now()
                END
            RETURNING id, requester_id, target_id, status, created_at, updated_at, responded_at
        `;
        const request = rows[0];

        const requester = await this.prisma.user.findUnique({
            where: { id: requesterId },
            select: { username: true, displayName: true },
        });

        await this.notifications.createNotification({
            recipientId: target.id,
            senderId: requesterId,
            type: 'SYSTEM',
            title: 'New follow request',
            message: `${requester?.displayName || requester?.username || 'Someone'} requested to follow you`,
            relatedId: requesterId,
            relatedType: 'user',
            actionUrl: '/settings/follow-requests',
        });

        return {
            success: true,
            following: false,
            requested: true,
            requestId: request.id,
            requestStatus: request.status,
            message: `Follow request sent to @${target.username}`,
        };
    }

    private async createFollow(followerId: string, followingId: string) {
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
    }

    private async emitFollowSideEffects(
        followerId: string,
        targetUser: { id: string; username: string; displayName: string | null },
    ) {
        const follower = await this.prisma.user.findUnique({
            where: { id: followerId },
            select: { username: true, displayName: true },
        });
        const followerName = follower?.displayName || follower?.username || 'Someone';

        await Promise.allSettled([
            this.notifications.notifyFollow(targetUser.id, followerId, followerName),
            this.prisma.activity.create({
                data: {
                    userId: followerId,
                    type: 'USER_FOLLOWED',
                    description: `Followed @${targetUser.username}`,
                    xpEarned: 0,
                    metadata: { followedUserId: targetUser.id },
                },
            }),
        ]);
    }

    private normalizeObject(value: unknown): Record<string, unknown> {
        return value && typeof value === 'object' && !Array.isArray(value)
            ? value as Record<string, unknown>
            : {};
    }
}
