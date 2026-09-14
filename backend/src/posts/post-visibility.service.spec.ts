import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PostVisibilityService } from './post-visibility.service';

describe('PostVisibilityService', () => {
  it('hides posts from private profiles from anonymous viewers', async () => {
    const prisma: any = {
      post: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'post-1',
          status: 'ACTIVE',
          authorId: 'author-1',
          communityId: null,
          author: { privacySettings: { profileVisibility: 'PRIVATE' } },
          community: null,
        }),
      },
    };

    const service = new PostVisibilityService(prisma);
    await expect(service.assertPostVisible('post-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('allows an existing follower to see a private-profile post', async () => {
    const prisma: any = {
      post: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'post-1',
          status: 'ACTIVE',
          authorId: 'author-1',
          communityId: null,
          author: { privacySettings: { profileVisibility: 'PRIVATE' } },
          community: null,
        }),
      },
      follow: { findMany: jest.fn().mockResolvedValue([{ followingId: 'author-1' }]) },
      communityMember: { findMany: jest.fn().mockResolvedValue([]) },
      block: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const service = new PostVisibilityService(prisma);
    await expect(service.assertPostVisible('post-1', 'viewer-1')).resolves.toBe(true);
  });

  it('rejects direct community posting by non-members', async () => {
    const prisma: any = {
      community: { findUnique: jest.fn().mockResolvedValue({ id: 'community-1' }) },
      communityMember: { findUnique: jest.fn().mockResolvedValue(null) },
    };

    const service = new PostVisibilityService(prisma);
    await expect(
      service.assertCanPostInCommunity('user-1', 'community-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
