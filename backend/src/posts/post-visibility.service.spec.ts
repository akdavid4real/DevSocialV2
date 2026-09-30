import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PostVisibilityService } from './post-visibility.service';

describe('PostVisibilityService', () => {
  it('counts a viewer once when they reopen the same post', async () => {
    const tx: any = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      view: {
        findFirst: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'view-1' }),
        create: jest.fn().mockResolvedValue({ id: 'view-1' }),
      },
      post: { update: jest.fn().mockResolvedValue({}) },
    };
    const prisma: any = { $transaction: jest.fn((callback) => callback(tx)) };
    const service = new PostVisibilityService(prisma);

    await expect(service.trackUniqueView('post-1', 'viewer-1')).resolves.toBe(true);
    await expect(service.trackUniqueView('post-1', 'viewer-1')).resolves.toBe(false);
    expect(tx.view.create).toHaveBeenCalledTimes(1);
    expect(tx.post.update).toHaveBeenCalledTimes(1);
    expect(tx.post.update).toHaveBeenCalledWith({
      where: { id: 'post-1' }, data: { viewsCount: { increment: 1 } },
    });
  });

  it('does not record a view if acquiring the database lock fails', async () => {
    const tx: any = {
      $executeRaw: jest.fn().mockRejectedValue(new Error('Lock unavailable')),
      view: { findFirst: jest.fn(), create: jest.fn() },
      post: { update: jest.fn() },
    };
    const prisma: any = { $transaction: jest.fn((callback) => callback(tx)) };
    const service = new PostVisibilityService(prisma);

    await expect(service.trackUniqueView('post-1', 'viewer-1')).rejects.toThrow('Lock unavailable');
    expect(tx.view.create).not.toHaveBeenCalled();
    expect(tx.post.update).not.toHaveBeenCalled();
  });

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
