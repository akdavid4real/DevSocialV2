import { ForbiddenException } from '@nestjs/common';
import { MessagesService } from './messages.service';

describe('MessagesService privacy and scale guards', () => {
  const notifications: any = {
    notifyMessage: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('rejects messaging when either user has blocked the other', async () => {
    const prisma: any = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'user-2', privacySettings: {} }),
      },
      block: {
        findFirst: jest.fn().mockResolvedValue({ id: 'block-1' }),
      },
    };

    const service = new MessagesService(prisma, notifications);

    await expect(
      service.sendMessage('user-1', { receiverId: 'user-2', content: 'hello' } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('caps message history queries at 100 rows', async () => {
    const prisma: any = {
      conversationParticipant: {
        findUnique: jest.fn().mockResolvedValue({ userId: 'user-1' }),
      },
      message: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const service = new MessagesService(prisma, notifications);
    await service.getMessages('conversation-1', 'user-1', 999);

    expect(prisma.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 }),
    );
  });

  it('uses an advisory lock before creating a direct-message conversation', async () => {
    const tx: any = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      conversationParticipant: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
      },
      conversation: {
        create: jest.fn().mockResolvedValue({ id: 'conversation-1' }),
      },
    };

    const prisma: any = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'user-2', privacySettings: {} }),
      },
      block: { findFirst: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn(async (callback: any) => callback(tx)),
    };

    const service = new MessagesService(prisma, notifications);
    const result = await service.getOrCreateConversation('user-1', 'user-2');

    expect(result).toEqual({ id: 'conversation-1' });
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.conversation.create).toHaveBeenCalledTimes(1);
  });
});
