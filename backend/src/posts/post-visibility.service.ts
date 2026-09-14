import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class PostVisibilityService {
  constructor(private readonly prisma: PrismaService) {}

  async assertCanPostInCommunity(userId: string, communityId?: string | null) {
    if (!communityId) return true;

    const [community, membership] = await Promise.all([
      this.prisma.community.findUnique({
        where: { id: communityId },
        select: { id: true },
      }),
      this.prisma.communityMember.findUnique({
        where: {
          communityId_userId: { communityId, userId },
        },
        select: { userId: true },
      }),
    ]);

    if (!community) throw new NotFoundException('Community not found');
    if (!membership) throw new ForbiddenException('Join this community before posting');
    return true;
  }

  async assertPostVisible(postId: string, viewerId?: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        status: true,
        authorId: true,
        communityId: true,
        author: { select: { privacySettings: true } },
        community: { select: { isPrivate: true } },
      },
    });

    if (!post || post.status !== 'ACTIVE') throw new NotFoundException('Post not found');

    const visible = await this.evaluateVisibility([
      {
        id: post.id,
        authorId: post.authorId,
        communityId: post.communityId,
        privacySettings: post.author.privacySettings,
        communityPrivate: Boolean(post.community?.isPrivate),
      },
    ], viewerId);

    if (!visible.has(post.id)) throw new NotFoundException('Post not found');
    return true;
  }

  async assertCommentVisible(commentId: string, viewerId?: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { postId: true },
    });
    if (!comment) throw new NotFoundException('Comment not found');
    return this.assertPostVisible(comment.postId, viewerId);
  }

  async filterPosts<T extends { id: string }>(posts: T[], viewerId?: string): Promise<T[]> {
    if (posts.length === 0) return [];

    const records = await this.prisma.post.findMany({
      where: { id: { in: posts.map((post) => post.id) } },
      select: {
        id: true,
        authorId: true,
        communityId: true,
        author: { select: { privacySettings: true } },
        community: { select: { isPrivate: true } },
      },
    });

    const visibleIds = await this.evaluateVisibility(
      records.map((post) => ({
        id: post.id,
        authorId: post.authorId,
        communityId: post.communityId,
        privacySettings: post.author.privacySettings,
        communityPrivate: Boolean(post.community?.isPrivate),
      })),
      viewerId,
    );

    return posts.filter((post) => visibleIds.has(post.id));
  }

  private async evaluateVisibility(
    records: Array<{
      id: string;
      authorId: string;
      communityId: string | null;
      privacySettings: unknown;
      communityPrivate: boolean;
    }>,
    viewerId?: string,
  ) {
    const visible = new Set<string>();
    const authorIds = [...new Set(records.map((record) => record.authorId))];
    const communityIds = [...new Set(records.map((record) => record.communityId).filter((id): id is string => Boolean(id)))];

    let following = new Set<string>();
    let memberships = new Set<string>();
    let blockedUsers = new Set<string>();

    if (viewerId) {
      const [followRows, membershipRows, blockRows] = await Promise.all([
        authorIds.length
          ? this.prisma.follow.findMany({
              where: { followerId: viewerId, followingId: { in: authorIds } },
              select: { followingId: true },
            })
          : Promise.resolve([]),
        communityIds.length
          ? this.prisma.communityMember.findMany({
              where: { userId: viewerId, communityId: { in: communityIds } },
              select: { communityId: true },
            })
          : Promise.resolve([]),
        authorIds.length
          ? this.prisma.block.findMany({
              where: {
                OR: [
                  { blockerId: viewerId, blockedId: { in: authorIds } },
                  { blockerId: { in: authorIds }, blockedId: viewerId },
                ],
              },
              select: { blockerId: true, blockedId: true },
            })
          : Promise.resolve([]),
      ]);

      following = new Set(followRows.map((row) => row.followingId));
      memberships = new Set(membershipRows.map((row) => row.communityId));
      blockedUsers = new Set(
        blockRows.map((row) => row.blockerId === viewerId ? row.blockedId : row.blockerId),
      );
    }

    for (const record of records) {
      if (viewerId && blockedUsers.has(record.authorId)) continue;

      const privacy = this.normalizeObject(record.privacySettings);
      const privateProfile = String(privacy.profileVisibility || 'PUBLIC').toUpperCase() === 'PRIVATE';
      const canSeePrivateProfile = Boolean(
        viewerId && (viewerId === record.authorId || following.has(record.authorId)),
      );
      if (privateProfile && !canSeePrivateProfile) continue;

      if (record.communityPrivate) {
        if (!viewerId || !record.communityId || !memberships.has(record.communityId)) continue;
      }

      visible.add(record.id);
    }

    return visible;
  }

  private normalizeObject(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
  }
}
