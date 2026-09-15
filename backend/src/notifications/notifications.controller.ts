import { Body, Controller, Delete, Get, NotFoundException, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { MobilePushService } from './mobile-push.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../common/prisma/prisma.service';
import { SavePushSubscriptionDto } from './dto/push-subscription.dto';
import { MobilePushTokenDto } from './dto/mobile-push-token.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
    constructor(
        private readonly notificationsService: NotificationsService,
        private readonly mobilePush: MobilePushService,
        private readonly prisma: PrismaService,
    ) {}

    @Get('push-subscription')
    getPushSubscription(@Req() req: any) {
        return this.notificationsService.getPushSubscription(req.user.id);
    }

    @Post('push-subscription')
    savePushSubscription(@Req() req: any, @Body() body: SavePushSubscriptionDto) {
        return this.notificationsService.savePushSubscription(req.user.id, body);
    }

    @Delete('push-subscription')
    removePushSubscription(@Req() req: any) {
        return this.notificationsService.removePushSubscription(req.user.id);
    }

    @Post('mobile-push-token')
    registerMobilePushToken(@Req() req: any, @Body() body: MobilePushTokenDto) {
        return this.mobilePush.register(req.user.id, body.token);
    }

    @Delete('mobile-push-token')
    removeMobilePushToken(@Req() req: any, @Body() body: MobilePushTokenDto) {
        return this.mobilePush.remove(req.user.id, body.token);
    }

    @Get(':id')
    async getNotification(@Req() req: any, @Param('id') id: string) {
        const notification = await this.prisma.notification.findFirst({
            where: { id, recipientId: req.user.id },
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

        if (!notification) throw new NotFoundException('Notification not found');
        return notification;
    }

    @Get()
    async getNotifications(
        @Req() req: any,
        @Query('limit') limit?: string,
        @Query('unread') unread?: string,
    ) {
        const parsedLimit = limit ? parseInt(limit) : 50;
        const limitNum = Math.min(Math.max(Number.isFinite(parsedLimit) ? parsedLimit : 50, 1), 100);
        const unreadOnly = unread === 'true';

        const [notifications, unreadCount] = await Promise.all([
            this.prisma.notification.findMany({
                where: {
                    recipientId: req.user.id,
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
                where: { recipientId: req.user.id, read: false },
            }),
        ]);

        return {
            success: true,
            data: { notifications, unreadCount },
        };
    }

    @Put('mark-read')
    async markAsRead(@Req() req: any, @Body() body: { notificationIds?: string[] }) {
        const ids = Array.isArray(body.notificationIds) ? body.notificationIds.slice(0, 100) : [];
        await this.prisma.notification.updateMany({
            where: ids.length > 0
                ? { id: { in: ids }, recipientId: req.user.id }
                : { recipientId: req.user.id, read: false },
            data: { read: true },
        });
        return { success: true };
    }

    @Put('mark-unread')
    async markAsUnread(@Req() req: any, @Body() body: { notificationIds: string[] }) {
        const ids = Array.isArray(body.notificationIds) ? body.notificationIds.slice(0, 100) : [];
        if (ids.length > 0) {
            await this.prisma.notification.updateMany({
                where: { id: { in: ids }, recipientId: req.user.id },
                data: { read: false },
            });
        }
        return { success: true };
    }
}
