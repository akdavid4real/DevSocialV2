import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationType, Prisma } from '../generated/prisma';
import { SocialUtilsService } from '../common/social-utils.service';
import { SavePushSubscriptionDto } from './dto/push-subscription.dto';

type PushPreferenceKey =
    | 'pushOnNewFollower'
    | 'pushOnMention'
    | 'pushOnLike'
    | 'pushOnComment'
    | 'pushOnMessage';

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);
    private readonly pushConfigured: boolean;

    constructor(
        private prisma: PrismaService,
        private socialUtils: SocialUtilsService,
        private config: ConfigService,
    ) {
        const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY');
        const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY');
        const subject = this.config.get<string>('VAPID_SUBJECT');
        this.pushConfigured = Boolean(publicKey && privateKey && subject);

        if (this.pushConfigured) {
            webpush.setVapidDetails(subject!, publicKey!, privateKey!);
        }
    }

    async getPushSubscription(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { pushSubscription: true },
        });

        return {
            subscribed: !!user?.pushSubscription,
            subscription: user?.pushSubscription ?? null,
            configured: this.pushConfigured,
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

        return { subscribed: true, configured: this.pushConfigured };
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
        pushPreferenceKey?: PushPreferenceKey;
    }) {
        try {
            if (data.recipientId === data.senderId) return null;

            const [recipient, blocked] = await Promise.all([
                this.prisma.user.findUnique({
                    where: { id: data.recipientId },
                    select: {
                        notificationSettings: true,
                        privacySettings: true,
                        pushSubscription: true,
                    },
                }),
                this.prisma.block.findFirst({
                    where: {
                        OR: [
                            { blockerId: data.recipientId, blockedId: data.senderId },
                            { blockerId: data.senderId, blockedId: data.recipientId },
                        ],
                    },
                    select: { id: true },
                }),
            ]);

            if (!recipient || blocked) return null;

            const privacy = this.normalizeObject(recipient.privacySettings);
            if (data.type === 'MENTION' && privacy.allowMentions === false) return null;

            const notification = await this.prisma.notification.create({
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

            await this.sendPushIfEnabled(
                data.recipientId,
                recipient.notificationSettings,
                recipient.pushSubscription,
                data.pushPreferenceKey,
                {
                    title: data.title,
                    body: data.message,
                    url: data.actionUrl || '/notifications',
                },
            );

            return notification;
        } catch (error: any) {
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
            pushPreferenceKey: 'pushOnMention',
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
            pushPreferenceKey: 'pushOnMention',
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
            pushPreferenceKey: 'pushOnComment',
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
            pushPreferenceKey: 'pushOnComment',
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
            pushPreferenceKey: 'pushOnLike',
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
            pushPreferenceKey: 'pushOnLike',
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
            pushPreferenceKey: 'pushOnNewFollower',
        });
    }

    async notifyMessage(recipientId: string, senderId: string, senderUsername: string) {
        return this.createNotification({
            recipientId,
            senderId,
            type: 'SYSTEM',
            title: '💬 New message',
            message: `${senderUsername} sent you a message`,
            relatedId: senderId,
            relatedType: 'user',
            actionUrl: '/messages',
            pushPreferenceKey: 'pushOnMessage',
        });
    }

    private async sendPushIfEnabled(
        userId: string,
        rawSettings: unknown,
        rawSubscription: unknown,
        preferenceKey: PushPreferenceKey | undefined,
        payload: { title: string; body: string; url: string },
    ) {
        if (!this.pushConfigured || !preferenceKey) return;

        const settings = this.normalizeObject(rawSettings);
        if (settings[preferenceKey] === false) return;

        const subscription = this.normalizeObject(rawSubscription);
        const keys = this.normalizeObject(subscription.keys);
        if (
            typeof subscription.endpoint !== 'string'
            || typeof keys.p256dh !== 'string'
            || typeof keys.auth !== 'string'
        ) {
            return;
        }

        try {
            await webpush.sendNotification(
                {
                    endpoint: subscription.endpoint,
                    keys: { p256dh: keys.p256dh, auth: keys.auth },
                },
                JSON.stringify(payload),
            );
        } catch (error: any) {
            if (error?.statusCode === 404 || error?.statusCode === 410) {
                await this.prisma.user.update({
                    where: { id: userId },
                    data: { pushSubscription: Prisma.JsonNull },
                });
                return;
            }
            this.logger.warn(`Push delivery failed for user ${userId}: ${error?.message || 'unknown error'}`);
        }
    }

    private normalizeObject(value: unknown): Record<string, any> {
        return value && typeof value === 'object' && !Array.isArray(value)
            ? value as Record<string, any>
            : {};
    }
}
