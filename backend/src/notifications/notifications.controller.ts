import { Controller, Delete, Get, Put, Post, Body, Query, Req, UseGuards, Param, NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../common/prisma/prisma.service';
import { SavePushSubscriptionDto } from './dto/push-subscription.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
    constructor(
        private readonly notificationsService: NotificationsService,
        private readonly prisma: PrismaService,
    ) {}

    @Get('push-subscription')
    async getPushSubscription(@Req() req: any) {
        return this.notificationsService.getPushSubscription(req.user.id);
    }

    @Post('push-subscription')
    async savePushSubscription(@Req() req: any, @Body() body: SavePushSubscriptionDto) {
        return this.notificationsService.savePushSubscription(req.user.id, body);
    }

    @Delete('push-subscription')
    async removePushSubscription(@Req() req: any) {
        return this.notificationsService.removePushSubscription(req.user.id);
    }

    @Get(':id')
    async getNotification(@Req() req: any, @Param('id') id: string) {
        const userId = req.user.id;

        const notification = await this.prisma.notification.findFirst({
            where: {
                id,
                recipientId: userId, // Security: only get own notifications
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatar: true,
                        level: true,
                    },
                },
            },
        });

        if (!notification) {
            throw new NotFoundException('Notification not found');
        }

        return notification;
    }

    @Get()
    async getNotifications(
        @Req() req: any,
        @Query('limit') limit?: string,
        @Query('unread') unread?: string,
    ) {
        const userId = req.user.id;
        const limitNum = limit ? parseInt(limit) : 50;
        const unreadOnly = unread === 'true';

        const [notifications, unreadCount] = await Promise.all([
            this.prisma.notification.findMany({
                where: {
                    recipientId: userId,
                    ...(unreadOnly ? { read: false } : {}),
                },
                include: {
                    sender: {
                        select: {
                            id: true,
                            username: true,
                            displayName: true,
                            avatar: true,
                            level: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: limitNum,
            }),
            this.prisma.notification.count({
                where: {
                    recipientId: userId,
                    read: false,
                },
            }),
        ]);

        return {
            success: true,
            data: {
                notifications,
                unreadCount,
            },
        };
    }

    @Put('mark-read')
    async markAsRead(@Req() req: any, @Body() body: { notificationIds?: string[] }) {
        const userId = req.user.id;

        if (body.notificationIds && body.notificationIds.length > 0) {
            // Mark specific notifications as read
            await this.prisma.notification.updateMany({
                where: {
                    id: { in: body.notificationIds },
                    recipientId: userId,
                },
                data: { read: true },
            });
        } else {
            // Mark all as read
            await this.prisma.notification.updateMany({
                where: {
                    recipientId: userId,
                    read: false,
                },
                data: { read: true },
            });
        }

        return { success: true };
    }

    @Put('mark-unread')
    async markAsUnread(@Req() req: any, @Body() body: { notificationIds: string[] }) {
        const userId = req.user.id;

        await this.prisma.notification.updateMany({
            where: {
                id: { in: body.notificationIds },
                recipientId: userId,
            },
            data: { read: false },
        });

        return { success: true };
    }
}
