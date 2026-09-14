import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommunitiesService } from './communities.service';

describe('CommunitiesService privacy', () => {
  const postsService: any = {};

  it('hides a private community from a non-member', async () => {
    const prisma: any = {
      community: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'community-1',
          slug: 'private-space',
          isPrivate: true,
          members: [{ userId: 'member-1', role: 'CREATOR' }],
        }),
      },
    };

    const service = new CommunitiesService(prisma, postsService);

    await expect(service.findOne('private-space', 'outsider')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('prevents self-joining a private community without an invitation', async () => {
    const prisma: any = {
      community: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'community-1',
          slug: 'private-space',
          isPrivate: true,
          memberCount: 1,
          members: [{ userId: 'creator-1', role: 'CREATOR' }],
        }),
      },
    };

    const service = new CommunitiesService(prisma, postsService);

    await expect(service.toggleMembership('outsider', 'private-space')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows an existing member to read a private community', async () => {
    const community = {
      id: 'community-1',
      slug: 'private-space',
      isPrivate: true,
      members: [{ userId: 'member-1', role: 'MEMBER' }],
    };
    const prisma: any = {
      community: {
        findFirst: jest.fn().mockResolvedValue(community),
      },
    };

    const service = new CommunitiesService(prisma, postsService);
    const result = await service.findOne('private-space', 'member-1');

    expect(result.id).toBe('community-1');
  });
});
