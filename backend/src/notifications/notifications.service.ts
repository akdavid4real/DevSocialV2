import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationType, Prisma } from '../generated/prisma';
import { SocialUtilsService } from '../common/social-utils.service';
import { SavePushSubscriptionDto } from './dto/push-subscription.dto';

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);

    constructor(
        private prisma: PrismaService,
        private socialUtils: SocialUtilsService,
    ) { }

    async getPushSubscription(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { pushSubscription: true },
        });

        return {
            subscribed: !!user?.pushSubscription,
            subscription: user?.pushSubscription ?? null,
        };
    }

    async savePushSubscription(userId: string, subscription: SavePushSubscriptionDto) {
        const savedSubscription: Prisma.InputJsonValue = {
            endpoint: subscription.endpoint,
            keys: {
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
            },
        };

        await this.prisma.user.update({
            where: { id: userId },
            data: { pushSubscription: savedSubscription },
        });

        return { subscribed: true };
    }

    async removePushSubscription(userId: string) {
        await this.prisma.user.update({
            where: { id: userId },
            data: { pushSubscription: Prisma.JsonNull },
        });

        return { subscribed: false };
    }

    async createNotification(data: {
        recipientId: string;
        senderId: string;
        type: NotificationType;
        title: string;
        message: string;
        relatedId?: string;
        relatedType?: string;
        actionUrl?: string;
    }) {
        try {
            // Don't notify self
            if (data.recipientId === data.senderId) {
                return null;
            }

            return await this.prisma.notification.create({
                data: {
                    recipientId: data.recipientId,
                    senderId: data.senderId,
                    type: data.type,
                    title: data.title,
                    message: data.message,
                    relatedId: data.relatedId,
                    relatedType: data.relatedType,
                    actionUrl: data.actionUrl,
                },
            });
        } catch (error) {
            this.logger.error(`Failed to create notification: ${error.message}`);
            return null;
        }
    }

    async notifyMention(recipientId: string, senderId: string, postId: string, senderUsername: string) {
        return this.createNotification({
            recipientId,
            senderId,
            type: 'MENTION',
            title: '📢 You were mentioned',
            message: `${senderUsername} mentioned you in a post`,
            relatedId: postId,
            relatedType: 'post',
            actionUrl: `/posts/${postId}`,
        });
    }

    async notifyCommentMention(recipientId: string, senderId: string, commentId: string, postId: string, senderUsername: string) {
        return this.createNotification({
            recipientId,
            senderId,
            type: 'MENTION',
            title: '📢 You were mentioned',
            message: `${senderUsername} mentioned you in a comment`,
            relatedId: commentId,
            relatedType: 'comment',
            actionUrl: `/posts/${postId}`,
        });
    }

    async notifyComment(recipientId: string, senderId: string, postId: string, senderUsername: string, commentPreview: string) {
        return this.createNotification({
            recipientId,
            senderId,
            type: 'COMMENT',
            title: '💬 New Comment',
            message: `${senderUsername}: ${commentPreview.substring(0, 50)}${commentPreview.length > 50 ? '...' : ''}`,
            relatedId: postId,
            relatedType: 'post',
            actionUrl: `/posts/${postId}`,
        });
    }

    async notifyReply(recipientId: string, senderId: string, commentId: string, postId: string, senderUsername: string, replyPreview: string) {
        return this.createNotification({
            recipientId,
            senderId,
            type: 'COMMENT',
            title: '💬 New Reply',
            message: `${senderUsername} replied: ${replyPreview.substring(0, 50)}${replyPreview.length > 50 ? '...' : ''}`,
            relatedId: commentId,
            relatedType: 'comment',
            actionUrl: `/posts/${postId}`,
        });
    }

    async notifyLike(recipientId: string, senderId: string, postId: string, senderUsername: string) {
        return this.createNotification({
            recipientId,
            senderId,
            type: 'LIKE',
            title: '❤️ New Like',
            message: `${senderUsername} liked your post`,
            relatedId: postId,
            relatedType: 'post',
            actionUrl: `/posts/${postId}`,
        });
    }

    async notifyCommentLike(recipientId: string, senderId: string, commentId: string, postId: string, senderUsername: string) {
        return this.createNotification({
            recipientId,
            senderId,
            type: 'LIKE',
            title: '❤️ Comment Liked',
            message: `${senderUsername} liked your comment`,
            relatedId: commentId,
            relatedType: 'comment',
            actionUrl: `/posts/${postId}`,
        });
    }

    async notifyFollow(recipientId: string, senderId: string, followerUsername: string) {
        return this.createNotification({
            recipientId,
            senderId,
            type: 'FOLLOW',
            title: '👤 New Follower',
            message: `${followerUsername} started following you`,
            relatedId: senderId,
            relatedType: 'user',
            actionUrl: `/@${followerUsername}`,
        });
    }
}
