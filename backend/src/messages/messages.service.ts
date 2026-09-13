import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
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
  constructor(private prisma: PrismaService) {}

  /**
   * Send a message to another user
   */
  async sendMessage(senderId: string, dto: SendMessageDto) {
    // Get or create conversation BEFORE transaction
    const conversation = await this.getOrCreateConversation(senderId, dto.receiverId);

    // Create message and update conversation in parallel (no transaction needed)
    const [message] = await Promise.all([
      this.prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId,
          receiverId: dto.receiverId,
          content: dto.content,
        },
        include: {
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
        },
      }),
      this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastActivity: new Date() },
      }),
    ]);

    return message;
  }

  /**
   * Get all conversations for a user
   */
  async getConversations(userId: string) {
    // Query the Conversation table directly via participants
    const conversations = await this.prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId,
          },
        },
      },
      orderBy: { lastActivity: 'desc' },
      include: {
        participants: true,
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

    // Build response with otherUser info and unread counts
    const result = await Promise.all(
      conversations.map(async (conv) => {
        const otherParticipant = conv.participants.find(
          (p) => p.userId !== userId,
        );

        if (!otherParticipant) return null;

        // Fetch other user's profile
        const otherUser = await this.prisma.user.findUnique({
          where: { id: otherParticipant.userId },
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        });

        if (!otherUser) return null;

        // Count unread messages for this user in this conversation
        const unreadCount = await this.prisma.message.count({
          where: {
            conversationId: conv.id,
            receiverId: userId,
            read: false,
          },
        });

        const lastMessage = conv.messages[0] || null;

        return {
          id: conv.id,
          lastMessage,
          lastMessageAt: lastMessage?.createdAt || conv.lastActivity,
          otherUser,
          unreadCount,
        };
      }),
    );

    return result.filter(Boolean);
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(conversationId: string, userId: string) {
    // Verify user is a participant
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!participant) {
      return [];
    }

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: {
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
      },
    });

    return messages;
  }

  /**
   * Mark messages as read
   */
  async markAsRead(conversationId: string, userId: string) {
    await this.prisma.message.updateMany({
      where: {
        conversationId,
        receiverId: userId,
        read: false,
      },
      data: {
        read: true,
      },
    });

    return { success: true };
  }

  async addReaction(conversationId: string, messageId: string, userId: string, emoji: string) {
    const normalizedEmoji = emoji?.trim();
    if (!normalizedEmoji) {
      throw new BadRequestException('Reaction emoji is required');
    }

    const message = await this.getParticipantMessage(conversationId, messageId, userId);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatar: true,
      },
    });

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

    const updatedMessage = await this.prisma.message.update({
      where: { id: messageId },
      data: { reactions: nextReactions as any },
      include: this.messageUserIncludes(),
    });

    return {
      success: true,
      data: {
        messageId,
        reactions: updatedMessage.reactions,
      },
    };
  }

  async removeReaction(conversationId: string, messageId: string, userId: string, emoji?: string) {
    const message = await this.getParticipantMessage(conversationId, messageId, userId);
    const currentReactions = this.parseReactions(message.reactions);
    const nextReactions = currentReactions.filter((reaction) => {
      if (reaction.userId !== userId) return true;
      return emoji ? reaction.emoji !== emoji : false;
    });

    const updatedMessage = await this.prisma.message.update({
      where: { id: messageId },
      data: { reactions: nextReactions as any },
      include: this.messageUserIncludes(),
    });

    return {
      success: true,
      data: {
        messageId,
        reactions: updatedMessage.reactions,
      },
    };
  }

  /**
   * Get or create a conversation between two users
   */
  async getOrCreateConversation(userId: string, otherUserId: string) {
    if (userId === otherUserId) {
      throw new BadRequestException('Cannot message yourself');
    }

    // Find conversations where the current user is a participant
    const userConversations = await this.prisma.conversationParticipant.findMany({
      where: { userId },
      select: { conversationId: true },
    });

    if (userConversations.length > 0) {
      // Check if the other user is also a participant in any of those conversations
      const conversationIds = userConversations.map((c) => c.conversationId);
      const sharedConversation = await this.prisma.conversationParticipant.findFirst({
        where: {
          userId: otherUserId,
          conversationId: { in: conversationIds },
        },
      });

      if (sharedConversation) {
        return { id: sharedConversation.conversationId };
      }
    }

    // Create new conversation with both users as participants
    const conversation = await this.prisma.conversation.create({
      data: {
        participants: {
          create: [{ userId }, { userId: otherUserId }],
        },
      },
    });

    return { id: conversation.id };
  }

  /**
   * Get unread message count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.message.count({
      where: {
        receiverId: userId,
        read: false,
      },
    });
  }

  private async getParticipantMessage(conversationId: string, messageId: string, userId: string) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!participant) {
      throw new NotFoundException('Conversation not found');
    }

    const message = await this.prisma.message.findFirst({
      where: {
        id: messageId,
        conversationId,
      },
      select: {
        id: true,
        reactions: true,
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    return message;
  }

  private parseReactions(reactions: unknown): MessageReaction[] {
    if (!Array.isArray(reactions)) {
      return [];
    }

    return reactions.filter((reaction): reaction is MessageReaction => {
      return Boolean(
        reaction &&
        typeof reaction === 'object' &&
        typeof (reaction as MessageReaction).userId === 'string' &&
        typeof (reaction as MessageReaction).emoji === 'string',
      );
    });
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
