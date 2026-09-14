import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SendMessageDto } from './dto/send-message.dto';

type MessageReaction = {
  userId: string;
  emoji: string;
  createdAt: string;
  user?: {
    id: string;
    username: string;
    displayName: string | null;
    avatar: string;
  };
};

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async sendMessage(senderId: string, dto: SendMessageDto) {
    await this.assertCanMessage(senderId, dto.receiverId);
    const conversation = await this.getOrCreateConversation(senderId, dto.receiverId);

    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId,
          receiverId: dto.receiverId,
          content: dto.content,
        },
        include: this.messageUserIncludes(),
      }),
      this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastActivity: new Date() },
      }),
    ]);

    const senderName = message.sender.displayName || message.sender.username;
    await this.notifications.notifyMessage(dto.receiverId, senderId, senderName);

    return message;
  }

  async getConversations(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        participants: { some: { userId } },
      },
      orderBy: { lastActivity: 'desc' },
      include: {
        participants: { select: { userId: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    if (conversations.length === 0) return [];

    const conversationIds = conversations.map((conversation) => conversation.id);
    const otherUserIds = [...new Set(
      conversations
        .map((conversation) => conversation.participants.find((participant) => participant.userId !== userId)?.userId)
        .filter((id): id is string => Boolean(id)),
    )];

    const [users, unreadGroups] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: otherUserIds } },
        select: {
          id: true,
          username: true,
          displayName: true,
          avatar: true,
        },
      }),
      this.prisma.message.groupBy({
        by: ['conversationId'],
        where: {
          conversationId: { in: conversationIds },
          receiverId: userId,
          read: false,
        },
        _count: { _all: true },
      }),
    ]);

    const usersById = new Map(users.map((user) => [user.id, user]));
    const unreadByConversation = new Map(
      unreadGroups.map((group) => [group.conversationId, group._count._all]),
    );

    return conversations.flatMap((conversation) => {
      const otherUserId = conversation.participants.find((participant) => participant.userId !== userId)?.userId;
      const otherUser = otherUserId ? usersById.get(otherUserId) : null;
      if (!otherUser) return [];

      const lastMessage = conversation.messages[0] || null;
      return [{
        id: conversation.id,
        lastMessage,
        lastMessageAt: lastMessage?.createdAt || conversation.lastActivity,
        otherUser,
        unreadCount: unreadByConversation.get(conversation.id) || 0,
      }];
    });
  }

  async getMessages(conversationId: string, userId: string, limit = 50, before?: string) {
    await this.assertParticipant(conversationId, userId);
    const take = Math.min(Math.max(limit || 50, 1), 100);

    if (before) {
      const cursorMessage = await this.prisma.message.findFirst({
        where: { id: before, conversationId },
        select: { id: true },
      });
      if (!cursorMessage) throw new BadRequestException('Invalid message cursor');
    }

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take,
      ...(before ? { cursor: { id: before }, skip: 1 } : {}),
      include: this.messageUserIncludes(),
    });

    return messages.reverse();
  }

  async markAsRead(conversationId: string, userId: string) {
    await this.assertParticipant(conversationId, userId);

    await this.prisma.message.updateMany({
      where: {
        conversationId,
        receiverId: userId,
        read: false,
      },
      data: { read: true },
    });

    return { success: true };
  }

  async addReaction(conversationId: string, messageId: string, userId: string, emoji: string) {
    const normalizedEmoji = emoji?.trim();
    if (!normalizedEmoji) throw new BadRequestException('Reaction emoji is required');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatar: true,
      },
    });

    return this.runSerializable(async (tx) => {
      const message = await this.getParticipantMessage(conversationId, messageId, userId, tx);
      const currentReactions = this.parseReactions(message.reactions);
      const nextReactions = [
        ...currentReactions.filter((reaction) => reaction.userId !== userId),
        {
          userId,
          emoji: normalizedEmoji,
          createdAt: new Date().toISOString(),
          user: user || undefined,
        },
      ];

      const updatedMessage = await tx.message.update({
        where: { id: messageId },
        data: { reactions: nextReactions as any },
        include: this.messageUserIncludes(),
      });

      return {
        success: true,
        data: { messageId, reactions: updatedMessage.reactions },
      };
    });
  }

  async removeReaction(conversationId: string, messageId: string, userId: string, emoji?: string) {
    return this.runSerializable(async (tx) => {
      const message = await this.getParticipantMessage(conversationId, messageId, userId, tx);
      const currentReactions = this.parseReactions(message.reactions);
      const nextReactions = currentReactions.filter((reaction) => {
        if (reaction.userId !== userId) return true;
        return emoji ? reaction.emoji !== emoji : false;
      });

      const updatedMessage = await tx.message.update({
        where: { id: messageId },
        data: { reactions: nextReactions as any },
        include: this.messageUserIncludes(),
      });

      return {
        success: true,
        data: { messageId, reactions: updatedMessage.reactions },
      };
    });
  }

  async getOrCreateConversation(userId: string, otherUserId: string) {
    if (userId === otherUserId) throw new BadRequestException('Cannot message yourself');
    await this.assertCanMessage(userId, otherUserId);

    const pairKey = [userId, otherUserId].sort().join(':');

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${pairKey}))`;

      const userConversations = await tx.conversationParticipant.findMany({
        where: { userId },
        select: { conversationId: true },
      });

      if (userConversations.length > 0) {
        const conversationIds = userConversations.map((item) => item.conversationId);
        const sharedConversation = await tx.conversationParticipant.findFirst({
          where: {
            userId: otherUserId,
            conversationId: { in: conversationIds },
          },
        });

        if (sharedConversation) return { id: sharedConversation.conversationId };
      }

      const conversation = await tx.conversation.create({
        data: {
          participants: {
            create: [{ userId }, { userId: otherUserId }],
          },
        },
      });

      return { id: conversation.id };
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.message.count({
      where: { receiverId: userId, read: false },
    });
  }

  private async assertCanMessage(senderId: string, receiverId: string) {
    const receiver = await this.prisma.user.findUnique({
      where: { id: receiverId },
      select: { id: true, privacySettings: true },
    });
    if (!receiver) throw new NotFoundException('User not found');

    const block = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: senderId, blockedId: receiverId },
          { blockerId: receiverId, blockedId: senderId },
        ],
      },
      select: { id: true },
    });
    if (block) throw new ForbiddenException('Messaging is not available between these users');

    const settings = this.normalizeObject(receiver.privacySettings);
    const whoCanMessage = typeof settings.whoCanMessage === 'string'
      ? settings.whoCanMessage.toUpperCase()
      : 'EVERYONE';

    if (whoCanMessage === 'NOBODY') {
      throw new ForbiddenException('This user is not accepting direct messages');
    }

    if (whoCanMessage === 'FOLLOWERS') {
      const receiverFollowsSender = await this.prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: receiverId,
            followingId: senderId,
          },
        },
        select: { id: true },
      });
      if (!receiverFollowsSender) {
        throw new ForbiddenException('This user only accepts messages from people they follow');
      }
    }
  }

  private async assertParticipant(conversationId: string, userId: string) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
      select: { userId: true },
    });
    if (!participant) throw new NotFoundException('Conversation not found');
  }

  private async getParticipantMessage(
    conversationId: string,
    messageId: string,
    userId: string,
    tx: Prisma.TransactionClient = this.prisma as unknown as Prisma.TransactionClient,
  ) {
    const participant = await tx.conversationParticipant.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });
    if (!participant) throw new NotFoundException('Conversation not found');

    const message = await tx.message.findFirst({
      where: { id: messageId, conversationId },
      select: { id: true, reactions: true },
    });
    if (!message) throw new NotFoundException('Message not found');
    return message;
  }

  private async runSerializable<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await this.prisma.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error: any) {
        if (error?.code !== 'P2034' || attempt === 2) throw error;
      }
    }
    throw new Error('Transaction failed');
  }

  private normalizeObject(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
  }

  private parseReactions(reactions: unknown): MessageReaction[] {
    if (!Array.isArray(reactions)) return [];

    return reactions.filter((reaction): reaction is MessageReaction => Boolean(
      reaction &&
      typeof reaction === 'object' &&
      typeof (reaction as MessageReaction).userId === 'string' &&
      typeof (reaction as MessageReaction).emoji === 'string',
    ));
  }

  private messageUserIncludes() {
    return {
      sender: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatar: true,
        },
      },
      receiver: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatar: true,
        },
      },
    };
  }
}
