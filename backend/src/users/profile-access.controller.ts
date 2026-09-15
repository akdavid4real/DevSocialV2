import { Controller, Get, NotFoundException, Param, Request, UseGuards } from '@nestjs/common';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { PrismaService } from '../common/prisma/prisma.service';

@Controller('profile-access')
export class ProfileAccessController {
    constructor(private readonly prisma: PrismaService) {}

    @Get(':username')
    @UseGuards(OptionalJwtAuthGuard)
    async getSummary(@Param('username') username: string, @Request() req: any) {
        const user = await this.prisma.user.findFirst({
            where: { username: { equals: username, mode: 'insensitive' } },
            select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
                bannerUrl: true,
                level: true,
                isVerified: true,
                followersCount: true,
                followingCount: true,
                privacySettings: true,
                createdAt: true,
            },
        });
        if (!user) throw new NotFoundException(`User @${username} not found`);

        const viewerId = req.user?.id as string | undefined;
        if (viewerId && viewerId !== user.id) {
            const blocked = await this.prisma.block.findFirst({
                where: {
                    OR: [
                        { blockerId: viewerId, blockedId: user.id },
                        { blockerId: user.id, blockedId: viewerId },
                    ],
                },
                select: { id: true },
            });
            if (blocked) throw new NotFoundException(`User @${username} not found`);
        }

        const privacy = user.privacySettings && typeof user.privacySettings === 'object' && !Array.isArray(user.privacySettings)
            ? user.privacySettings as Record<string, unknown>
            : {};
        const isPrivate = String(privacy.profileVisibility || 'PUBLIC').toUpperCase() === 'PRIVATE';

        let isFollowing = viewerId === user.id;
        let requestId: string | null = null;
        let requestStatus: string | null = null;

        if (viewerId && viewerId !== user.id) {
            const [follow, requestRows] = await Promise.all([
                this.prisma.follow.findUnique({
                    where: {
                        followerId_followingId: {
                            followerId: viewerId,
                            followingId: user.id,
                        },
                    },
                    select: { id: true },
                }),
                this.prisma.$queryRaw<Array<{ id: string; status: string }>>`
                    SELECT id, status
                    FROM public.follow_requests
                    WHERE requester_id = ${viewerId}::uuid
                      AND target_id = ${user.id}::uuid
                    LIMIT 1
                `,
            ]);
            isFollowing = Boolean(follow);
            requestStatus = requestRows[0]?.status || null;
            requestId = requestStatus === 'PENDING' ? requestRows[0].id : null;
        }

        const canViewContent = !isPrivate || isFollowing || viewerId === user.id;
        return {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            avatar: user.avatar,
            bannerUrl: user.bannerUrl,
            level: user.level,
            isVerified: user.isVerified,
            followersCount: user.followersCount,
            followingCount: user.followingCount,
            createdAt: user.createdAt,
            isPrivate,
            canViewContent,
            isFollowing,
            followRequested: requestStatus === 'PENDING',
            requestId,
            requestStatus,
            // Keep the legacy profile page shape stable without disclosing protected details.
            bio: '',
            affiliation: '',
            techStack: [],
            interests: [],
            points: 0,
            badges: [],
            location: '',
            website: '',
            githubUsername: '',
            linkedinUrl: '',
        };
    }
}
