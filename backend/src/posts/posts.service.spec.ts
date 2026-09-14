import { BadRequestException } from '@nestjs/common';
import { Prisma } from '../generated/prisma';
import { PostsService } from './posts.service';

describe('PostsService integrity guards', () => {
  const socialUtils: any = {
    extractMentions: jest.fn().mockReturnValue([]),
    extractHashtags: jest.fn().mockReturnValue([]),
  };
  const notifications: any = {
    notifyCommentMention: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    socialUtils.extractMentions.mockReturnValue([]);
  });

  it('rejects a reply whose parent belongs to another post', async () => {
    const prisma: any = {
      post: {
        findUnique: jest.fn().mockResolvedValue({ authorId: 'post-author' }),
      },
      comment: {
        findUnique: jest.fn().mockResolvedValue({ authorId: 'parent-author', postId: 'other-post' }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ username: 'david', displayName: 'David' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      block: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn(),
    };

    const service = new PostsService(prisma, socialUtils, notifications);

    await expect(
      service.addComment('target-post', 'user-1', 'reply', 'parent-comment'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('does not subtract XP when a user removes a like from their own comment', async () => {
    const comment = {
      id: 'comment-1',
      authorId: 'user-1',
      postId: 'post-1',
      likesCount: 1,
    };

    const tx: any = {
      comment: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(comment)
          .mockResolvedValueOnce({ likesCount: 0 }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      like: {
        findUnique: jest.fn().mockResolvedValue({ id: 'like-1' }),
        delete: jest.fn().mockResolvedValue({}),
      },
      user: { update: jest.fn() },
      xpLog: { deleteMany: jest.fn() },
    };

    const prisma: any = {
      $transaction: jest.fn(async (callback: any) => callback(tx)),
    };

    const service = new PostsService(prisma, socialUtils, notifications);
    const result = await service.toggleCommentLike('comment-1', 'user-1');

    expect(result).toMatchObject({ liked: false, likesCount: 0, xpChange: 0, isOwnComment: true });
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(tx.xpLog.deleteMany).not.toHaveBeenCalled();
  });

  it('uses a serializable transaction when recording a poll vote', async () => {
    let transactionOptions: any;
    const tx: any = {
      post: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'post-1',
          status: 'ACTIVE',
          poll: {
            question: 'Pick one',
            options: [{ id: 'a', text: 'A', votes: 0, voters: [] }],
            totalVotes: 0,
            settings: { multipleChoice: false },
          },
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      user: { update: jest.fn().mockResolvedValue({}) },
      xpLog: { create: jest.fn().mockResolvedValue({}) },
    };

    const prisma: any = {
      $transaction: jest.fn(async (callback: any, options: any) => {
        transactionOptions = options;
        return callback(tx);
      }),
    };

    const service = new PostsService(prisma, socialUtils, notifications);
    const result = await service.votePoll('post-1', 'user-1', ['a']);

    expect(result.xpAwarded).toBe(5);
    expect(transactionOptions).toEqual({
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
    expect(tx.user.update).toHaveBeenCalledTimes(1);
    expect(tx.xpLog.create).toHaveBeenCalledTimes(1);
  });

  it('does not persist or notify a comment mention when the target disabled mentions', async () => {
    socialUtils.extractMentions.mockReturnValue(['privateuser']);

    const tx: any = {
      comment: {
        create: jest.fn().mockResolvedValue({
          id: 'comment-1',
          postId: 'post-1',
          authorId: 'user-1',
          content: '@privateuser hello',
          author: { id: 'user-1', username: 'david', displayName: 'David', avatar: '', level: 1 },
        }),
      },
      user: { update: jest.fn().mockResolvedValue({}) },
      xpLog: { create: jest.fn().mockResolvedValue({}) },
      activity: { create: jest.fn().mockResolvedValue({}) },
      userMention: { create: jest.fn().mockResolvedValue({}) },
    };

    const prisma: any = {
      post: { findUnique: jest.fn().mockResolvedValue({ authorId: 'user-1' }) },
      comment: { findUnique: jest.fn() },
      user: {
        findUnique: jest.fn().mockResolvedValue({ username: 'david', displayName: 'David' }),
        findMany: jest.fn().mockResolvedValue([
          { id: 'user-2', username: 'privateuser', privacySettings: { allowMentions: false } },
        ]),
      },
      block: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn(async (callback: any) => callback(tx)),
    };

    const service = new PostsService(prisma, socialUtils, notifications);
    await service.addComment('post-1', 'user-1', '@privateuser hello');

    expect(tx.userMention.create).not.toHaveBeenCalled();
    expect(notifications.notifyCommentMention).not.toHaveBeenCalled();
  });
});
