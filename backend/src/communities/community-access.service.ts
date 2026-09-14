import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type JoinRequestRow = {
    id: string;
    community_id: string;
    user_id: string;
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
    reviewed_by_id: string | null;
    created_at: Date;
    updated_at: Date;
    reviewed_at: Date | null;
};

type InviteRow = {
    id: string;
    community_id: string;
    inviter_id: string;
    invitee_id: string;
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
    created_at: Date;
    updated_at: Date;
    responded_at: Date | null;
};

@Injectable()
export class CommunityAccessService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly notifications: NotificationsService,
    ) {}

    async requestJoin(userId: string, idOrSlug: string) {
        const community = await this.findCommunity(idOrSlug);
        if (!community.isPrivate) throw new BadRequestException('Public communities can be joined directly');

        const existingMember = await this.prisma.communityMember.findUnique({
            where: { communityId_userId: { communityId: community.id, userId } },
            select: { userId: true },
        });
        if (existingMember) return { success: true, isJoined: true, requested: false };

        const block = await this.prisma.block.findFirst({
            where: {
                OR: [
                    { blockerId: userId, blockedId: community.creatorId },
                    { blockerId: community.creatorId, blockedId: userId },
                ],
            },
            select: { id: true },
        });
        if (block) throw new ForbiddenException('Community access is not available');

        const rows = await this.prisma.$queryRaw<JoinRequestRow[]>`
            INSERT INTO public.community_join_requests
                (community_id, user_id, status, reviewed_by_id, reviewed_at, created_at)
            VALUES (${community.id}::uuid, ${userId}::uuid, 'PENDING', NULL, NULL, now())
            ON CONFLICT (community_id, user_id)
            DO UPDATE SET
                status = 'PENDING',
                reviewed_by_id = NULL,
                reviewed_at = NULL,
                created_at = CASE
                    WHEN public.community_join_requests.status = 'PENDING'
                        THEN public.community_join_requests.created_at
                    ELSE now()
                END
            RETURNING id, community_id, user_id, status, reviewed_by_id, created_at, updated_at, reviewed_at
        `;

        const requester = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { username: true, displayName: true },
        });
        await this.notifications.createNotification({
            recipientId: community.creatorId,
            senderId: userId,
            type: 'SYSTEM',
            title: 'Community join request',
            message: `${requester?.displayName || requester?.username || 'Someone'} requested to join ${community.name}`,
            relatedId: community.id,
            relatedType: 'community',
            actionUrl: `/communities/${community.slug}`,
        });

        return {
            success: true,
            isJoined: false,
            requested: true,
            requestId: rows[0].id,
            requestStatus: rows[0].status,
        };
    }

    async cancelJoinRequest(userId: string, requestId: string) {
        const changed = await this.prisma.$executeRaw`
            UPDATE public.community_join_requests
            SET status = 'CANCELLED', reviewed_at = now()
            WHERE id = ${requestId}::uuid
              AND user_id = ${userId}::uuid
              AND status = 'PENDING'
        `;
        if (!changed) throw new NotFoundException('Join request not found');
        return { success: true, requestStatus: 'CANCELLED' };
    }

    async getJoinRequests(actorId: string, idOrSlug: string, page = 1, limit = 20) {
        const community = await this.assertCanManage(actorId, idOrSlug);
        const safePage = Math.max(page || 1, 1);
        const safeLimit = Math.min(Math.max(limit || 20, 1), 100);
        const offset = (safePage - 1) * safeLimit;

        const [requests, countRows] = await Promise.all([
            this.prisma.$queryRaw<Array<JoinRequestRow & {
                username: string;
                display_name: string | null;
                avatar: string;
                level: number;
            }>>`
                SELECT cjr.id, cjr.community_id, cjr.user_id, cjr.status, cjr.reviewed_by_id,
                       cjr.created_at, cjr.updated_at, cjr.reviewed_at,
                       u.username, u."displayName" AS display_name, u.avatar, u.level
                FROM public.community_join_requests cjr
                JOIN public."User" u ON u.id = cjr.user_id
                WHERE cjr.community_id = ${community.id}::uuid
                  AND cjr.status = 'PENDING'
                ORDER BY cjr.created_at DESC
                LIMIT ${safeLimit} OFFSET ${offset}
            `,
            this.prisma.$queryRaw<Array<{ count: bigint }>>`
                SELECT COUNT(*)::bigint AS count
                FROM public.community_join_requests
                WHERE community_id = ${community.id}::uuid AND status = 'PENDING'
            `,
        ]);

        const total = Number(countRows[0]?.count || 0);
        return {
            requests: requests.map((request) => ({
                id: request.id,
                status: request.status,
                createdAt: request.created_at,
                user: {
                    id: request.user_id,
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

    async reviewJoinRequest(actorId: string, idOrSlug: string, requestId: string, accept: boolean) {
        const community = await this.assertCanManage(actorId, idOrSlug);

        const requesterId = await this.prisma.$transaction(async (tx) => {
            const rows = await tx.$queryRaw<JoinRequestRow[]>`
                SELECT id, community_id, user_id, status, reviewed_by_id, created_at, updated_at, reviewed_at
                FROM public.community_join_requests
                WHERE id = ${requestId}::uuid
                FOR UPDATE
            `;
            const request = rows[0];
            if (!request || request.community_id !== community.id || request.status !== 'PENDING') {
                throw new NotFoundException('Join request not found');
            }

            if (accept) {
                const existing = await tx.communityMember.findUnique({
                    where: {
                        communityId_userId: {
                            communityId: community.id,
                            userId: request.user_id,
                        },
                    },
                    select: { userId: true },
                });
                if (!existing) {
                    await tx.communityMember.create({
                        data: { communityId: community.id, userId: request.user_id },
                    });
                    await tx.community.update({
                        where: { id: community.id },
                        data: { memberCount: { increment: 1 } },
                    });
                }
            }

            await tx.$executeRaw`
                UPDATE public.community_join_requests
                SET status = ${accept ? 'ACCEPTED' : 'REJECTED'},
                    reviewed_by_id = ${actorId}::uuid,
                    reviewed_at = now()
                WHERE id = ${requestId}::uuid
            `;

            if (accept) {
                await tx.$executeRaw`
                    UPDATE public.community_invites
                    SET status = 'ACCEPTED', responded_at = now()
                    WHERE community_id = ${community.id}::uuid
                      AND invitee_id = ${request.user_id}::uuid
                      AND status = 'PENDING'
                `;
            }

            return request.user_id;
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

        await this.notifications.createNotification({
            recipientId: requesterId,
            senderId: actorId,
            type: 'SYSTEM',
            title: accept ? 'Community request accepted' : 'Community request declined',
            message: accept
                ? `Your request to join ${community.name} was accepted`
                : `Your request to join ${community.name} was declined`,
            relatedId: community.id,
            relatedType: 'community',
            actionUrl: accept ? `/communities/${community.slug}` : '/communities',
        });

        return { success: true, accepted: accept };
    }

    async inviteUser(actorId: string, idOrSlug: string, inviteeId: string) {
        const community = await this.assertCanManage(actorId, idOrSlug);
        if (actorId === inviteeId) throw new BadRequestException('You are already in this community');

        const [invitee, existingMember, block] = await Promise.all([
            this.prisma.user.findUnique({
                where: { id: inviteeId },
                select: { id: true, username: true, displayName: true },
            }),
            this.prisma.communityMember.findUnique({
                where: { communityId_userId: { communityId: community.id, userId: inviteeId } },
                select: { userId: true },
            }),
            this.prisma.block.findFirst({
                where: {
                    OR: [
                        { blockerId: actorId, blockedId: inviteeId },
                        { blockerId: inviteeId, blockedId: actorId },
                    ],
                },
                select: { id: true },
            }),
        ]);

        if (!invitee) throw new NotFoundException('User not found');
        if (existingMember) throw new BadRequestException('User is already a member');
        if (block) throw new ForbiddenException('This user cannot be invited');

        const rows = await this.prisma.$queryRaw<InviteRow[]>`
            INSERT INTO public.community_invites
                (community_id, inviter_id, invitee_id, status, responded_at, created_at)
            VALUES (${community.id}::uuid, ${actorId}::uuid, ${inviteeId}::uuid, 'PENDING', NULL, now())
            ON CONFLICT (community_id, invitee_id)
            DO UPDATE SET
                inviter_id = EXCLUDED.inviter_id,
                status = 'PENDING',
                responded_at = NULL,
                created_at = CASE
                    WHEN public.community_invites.status = 'PENDING'
                        THEN public.community_invites.created_at
                    ELSE now()
                END
            RETURNING id, community_id, inviter_id, invitee_id, status, created_at, updated_at, responded_at
        `;

        await this.notifications.createNotification({
            recipientId: inviteeId,
            senderId: actorId,
            type: 'SYSTEM',
            title: 'Community invitation',
            message: `You were invited to join ${community.name}`,
            relatedId: community.id,
            relatedType: 'community',
            actionUrl: '/communities/invitations',
        });

        return { success: true, inviteId: rows[0].id, status: rows[0].status };
    }

    async getMyInvites(userId: string, page = 1, limit = 20) {
        const safePage = Math.max(page || 1, 1);
        const safeLimit = Math.min(Math.max(limit || 20, 1), 100);
        const offset = (safePage - 1) * safeLimit;

        const [invites, countRows] = await Promise.all([
            this.prisma.$queryRaw<Array<InviteRow & {
                community_name: string;
                community_slug: string;
                community_avatar: string | null;
                inviter_username: string;
                inviter_display_name: string | null;
            }>>`
                SELECT ci.id, ci.community_id, ci.inviter_id, ci.invitee_id, ci.status,
                       ci.created_at, ci.updated_at, ci.responded_at,
                       c.name AS community_name, c.slug AS community_slug, c.avatar AS community_avatar,
                       u.username AS inviter_username, u."displayName" AS inviter_display_name
                FROM public.community_invites ci
                JOIN public."Community" c ON c.id = ci.community_id
                JOIN public."User" u ON u.id = ci.inviter_id
                WHERE ci.invitee_id = ${userId}::uuid AND ci.status = 'PENDING'
                ORDER BY ci.created_at DESC
                LIMIT ${safeLimit} OFFSET ${offset}
            `,
            this.prisma.$queryRaw<Array<{ count: bigint }>>`
                SELECT COUNT(*)::bigint AS count
                FROM public.community_invites
                WHERE invitee_id = ${userId}::uuid AND status = 'PENDING'
            `,
        ]);

        const total = Number(countRows[0]?.count || 0);
        return {
            invites: invites.map((invite) => ({
                id: invite.id,
                status: invite.status,
                createdAt: invite.created_at,
                community: {
                    id: invite.community_id,
                    name: invite.community_name,
                    slug: invite.community_slug,
                    avatar: invite.community_avatar,
                },
                inviter: {
                    id: invite.inviter_id,
                    username: invite.inviter_username,
                    displayName: invite.inviter_display_name,
                },
            })),
            total,
            page: safePage,
            lastPage: Math.ceil(total / safeLimit),
        };
    }

    async respondToInvite(userId: string, inviteId: string, accept: boolean) {
        const result = await this.prisma.$transaction(async (tx) => {
            const rows = await tx.$queryRaw<InviteRow[]>`
                SELECT id, community_id, inviter_id, invitee_id, status, created_at, updated_at, responded_at
                FROM public.community_invites
                WHERE id = ${inviteId}::uuid
                FOR UPDATE
            `;
            const invite = rows[0];
            if (!invite || invite.invitee_id !== userId || invite.status !== 'PENDING') {
                throw new NotFoundException('Community invitation not found');
            }

            const community = await tx.community.findUnique({
                where: { id: invite.community_id },
                select: { id: true, name: true, slug: true },
            });
            if (!community) throw new NotFoundException('Community not found');

            if (accept) {
                const existing = await tx.communityMember.findUnique({
                    where: {
                        communityId_userId: {
                            communityId: invite.community_id,
                            userId,
                        },
                    },
                    select: { userId: true },
                });
                if (!existing) {
                    await tx.communityMember.create({
                        data: { communityId: invite.community_id, userId },
                    });
                    await tx.community.update({
                        where: { id: invite.community_id },
                        data: { memberCount: { increment: 1 } },
                    });
                }
            }

            await tx.$executeRaw`
                UPDATE public.community_invites
                SET status = ${accept ? 'ACCEPTED' : 'REJECTED'}, responded_at = now()
                WHERE id = ${inviteId}::uuid
            `;

            if (accept) {
                await tx.$executeRaw`
                    UPDATE public.community_join_requests
                    SET status = 'ACCEPTED', reviewed_by_id = ${invite.inviter_id}::uuid, reviewed_at = now()
                    WHERE community_id = ${invite.community_id}::uuid
                      AND user_id = ${userId}::uuid
                      AND status = 'PENDING'
                `;
            }

            return { invite, community };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

        await this.notifications.createNotification({
            recipientId: result.invite.inviter_id,
            senderId: userId,
            type: 'SYSTEM',
            title: accept ? 'Community invitation accepted' : 'Community invitation declined',
            message: accept
                ? `Your invitation to ${result.community.name} was accepted`
                : `Your invitation to ${result.community.name} was declined`,
            relatedId: result.community.id,
            relatedType: 'community',
            actionUrl: `/communities/${result.community.slug}`,
        });

        return {
            success: true,
            accepted: accept,
            community: accept ? result.community : undefined,
        };
    }

    async getRequestState(userId: string, communityId: string) {
        const [requestRows, inviteRows] = await Promise.all([
            this.prisma.$queryRaw<JoinRequestRow[]>`
                SELECT id, community_id, user_id, status, reviewed_by_id, created_at, updated_at, reviewed_at
                FROM public.community_join_requests
                WHERE community_id = ${communityId}::uuid AND user_id = ${userId}::uuid
                LIMIT 1
            `,
            this.prisma.$queryRaw<InviteRow[]>`
                SELECT id, community_id, inviter_id, invitee_id, status, created_at, updated_at, responded_at
                FROM public.community_invites
                WHERE community_id = ${communityId}::uuid AND invitee_id = ${userId}::uuid
                LIMIT 1
            `,
        ]);
        return {
            requestId: requestRows[0]?.status === 'PENDING' ? requestRows[0].id : null,
            requestStatus: requestRows[0]?.status || null,
            inviteId: inviteRows[0]?.status === 'PENDING' ? inviteRows[0].id : null,
            inviteStatus: inviteRows[0]?.status || null,
        };
    }

    private async assertCanManage(userId: string, idOrSlug: string) {
        const community = await this.findCommunity(idOrSlug);
        const member = await this.prisma.communityMember.findUnique({
            where: { communityId_userId: { communityId: community.id, userId } },
            select: { role: true },
        });
        if (!member || !['CREATOR', 'MODERATOR'].includes(member.role)) {
            throw new ForbiddenException('Community manager access required');
        }
        return community;
    }

    private async findCommunity(idOrSlug: string) {
        const community = await this.prisma.community.findFirst({
            where: UUID_REGEX.test(idOrSlug) ? { id: idOrSlug } : { slug: idOrSlug },
            select: {
                id: true,
                name: true,
                slug: true,
                isPrivate: true,
                creatorId: true,
            },
        });
        if (!community) throw new NotFoundException('Community not found');
        return community;
    }
}
