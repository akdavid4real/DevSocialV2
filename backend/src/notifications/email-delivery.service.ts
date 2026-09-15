import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';

const PROCESS_INTERVAL_MS = 60_000;
const PROCESSING_LEASE_MINUTES = 10;
const MAX_ATTEMPTS = 5;

type Frequency = 'INSTANT' | 'HOURLY' | 'DAILY' | 'WEEKLY';

type QueueRow = {
    id: string;
    recipient_id: string;
    recipient_email: string;
    subject: string;
    body: string;
    action_url: string | null;
    frequency: Frequency;
    attempts: number;
};

@Injectable()
export class EmailDeliveryService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(EmailDeliveryService.name);
    private readonly apiKey: string | undefined;
    private readonly from: string | undefined;
    private readonly appUrl: string;
    private timer?: ReturnType<typeof setInterval>;

    constructor(
        private readonly prisma: PrismaService,
        private readonly config: ConfigService,
    ) {
        this.apiKey = this.config.get<string>('RESEND_API_KEY');
        this.from = this.config.get<string>('EMAIL_FROM');
        this.appUrl = (this.config.get<string>('FRONTEND_URL') || 'https://devsocial.app').replace(/\/$/, '');
    }

    onModuleInit() {
        this.timer = setInterval(() => {
            void this.processDueEmails().catch((error) => {
                this.logger.warn(`Email queue processing failed: ${error?.message || error}`);
            });
        }, PROCESS_INTERVAL_MS);
        this.timer.unref?.();
    }

    onModuleDestroy() {
        if (this.timer) clearInterval(this.timer);
    }

    get configured() {
        return Boolean(this.apiKey && this.from);
    }

    async queue(input: {
        recipientId: string;
        notificationId: string;
        email: string;
        eventKey: string;
        subject: string;
        body: string;
        actionUrl?: string | null;
        frequency: string;
    }) {
        const frequency = String(input.frequency || 'INSTANT').toUpperCase();
        if (frequency === 'NEVER') return;
        if (!['INSTANT', 'HOURLY', 'DAILY', 'WEEKLY'].includes(frequency)) return;

        const deliverAfter = this.deliveryTime(frequency as Frequency);
        await this.prisma.$executeRaw`
            INSERT INTO public.email_notification_queue
                (recipient_id, notification_id, recipient_email, event_key, subject, body, action_url, frequency, deliver_after)
            VALUES
                (${input.recipientId}::uuid, ${input.notificationId}::uuid, ${input.email}, ${input.eventKey}, ${input.subject}, ${input.body}, ${input.actionUrl || null}, ${frequency}, ${deliverAfter})
            ON CONFLICT (notification_id) DO NOTHING
        `;

        if (frequency === 'INSTANT' && this.configured) {
            await this.processDueEmails(20);
        }
    }

    async processDueEmails(limit = 100) {
        if (!this.configured) return { sent: 0, configured: false };
        const safeLimit = Math.min(Math.max(limit || 100, 1), 500);

        await this.recoverAbandonedClaims();

        const recipientRows = await this.prisma.$queryRaw<Array<{ recipient_id: string }>>`
            SELECT DISTINCT recipient_id
            FROM public.email_notification_queue
            WHERE status IN ('PENDING','FAILED')
              AND deliver_after <= now()
              AND attempts < ${MAX_ATTEMPTS}
            ORDER BY recipient_id
            LIMIT ${safeLimit}
        `;

        let sent = 0;
        for (const recipient of recipientRows) {
            const rows = await this.claimRecipientBatch(recipient.recipient_id);
            if (rows.length === 0) continue;

            try {
                const digest = rows.length > 1 || rows[0].frequency !== 'INSTANT';
                await this.sendWithResend({
                    to: rows[0].recipient_email,
                    subject: digest ? `DevSocial: ${rows.length} new updates` : rows[0].subject,
                    html: digest ? this.digestHtml(rows) : this.singleHtml(rows[0]),
                });

                await this.markRows(rows.map((row) => row.id), 'SENT');
                sent += rows.length;
            } catch (error: any) {
                await this.markRows(rows.map((row) => row.id), 'FAILED', error?.message || 'Email delivery failed');
                this.logger.warn(`Email delivery failed for ${recipient.recipient_id}: ${error?.message || error}`);
            }
        }

        return { sent, configured: true };
    }

    private async recoverAbandonedClaims() {
        await this.prisma.$executeRaw`
            UPDATE public.email_notification_queue
            SET status = 'FAILED',
                last_error = COALESCE(last_error, 'Worker claim expired before completion'),
                deliver_after = now()
            WHERE status = 'PROCESSING'
              AND deliver_after <= now()
              AND attempts < ${MAX_ATTEMPTS}
        `;
    }

    private async claimRecipientBatch(recipientId: string): Promise<QueueRow[]> {
        return this.prisma.$transaction(async (tx) => {
            const rows = await tx.$queryRaw<QueueRow[]>`
                SELECT id, recipient_id, recipient_email, subject, body, action_url, frequency, attempts
                FROM public.email_notification_queue
                WHERE recipient_id = ${recipientId}::uuid
                  AND status IN ('PENDING','FAILED')
                  AND deliver_after <= now()
                  AND attempts < ${MAX_ATTEMPTS}
                ORDER BY created_at ASC
                LIMIT 50
                FOR UPDATE SKIP LOCKED
            `;
            if (rows.length === 0) return [];
            const ids = rows.map((row) => row.id);
            await tx.$executeRaw`
                UPDATE public.email_notification_queue
                SET status = 'PROCESSING',
                    attempts = attempts + 1,
                    last_error = NULL,
                    deliver_after = now() + (${PROCESSING_LEASE_MINUTES} * interval '1 minute')
                WHERE id = ANY(${ids}::uuid[])
            `;
            return rows;
        });
    }

    private async markRows(ids: string[], status: 'SENT' | 'FAILED', error?: string) {
        if (ids.length === 0) return;
        if (status === 'SENT') {
            await this.prisma.$executeRaw`
                UPDATE public.email_notification_queue
                SET status = 'SENT', sent_at = now(), last_error = NULL
                WHERE id = ANY(${ids}::uuid[])
            `;
        } else {
            await this.prisma.$executeRaw`
                UPDATE public.email_notification_queue
                SET status = 'FAILED',
                    last_error = ${error || 'Email delivery failed'},
                    deliver_after = now() + (interval '5 minutes' * LEAST(attempts, 5))
                WHERE id = ANY(${ids}::uuid[])
            `;
        }
    }

    private deliveryTime(frequency: Frequency) {
        const now = new Date();
        if (frequency === 'INSTANT') return now;
        const result = new Date(now);
        if (frequency === 'HOURLY') {
            result.setMinutes(0, 0, 0);
            result.setHours(result.getHours() + 1);
        } else if (frequency === 'DAILY') {
            result.setHours(8, 0, 0, 0);
            if (result <= now) result.setDate(result.getDate() + 1);
        } else {
            result.setHours(8, 0, 0, 0);
            const days = (8 - result.getDay()) % 7 || 7;
            result.setDate(result.getDate() + days);
        }
        return result;
    }

    private async sendWithResend(input: { to: string; subject: string; html: string }) {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
                from: this.from,
                to: [input.to],
                subject: input.subject,
                html: input.html,
            }),
        });
        if (!response.ok) {
            const payload = await response.text().catch(() => '');
            throw new Error(`Resend ${response.status}: ${payload.slice(0, 300)}`);
        }
    }

    private singleHtml(row: QueueRow) {
        const link = row.action_url ? this.absoluteUrl(row.action_url) : this.appUrl;
        return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><h2>${this.escape(row.subject)}</h2><p>${this.escape(row.body)}</p><p><a href="${this.escape(link)}">Open DevSocial</a></p></div>`;
    }

    private digestHtml(rows: QueueRow[]) {
        const items = rows.map((row) => {
            const link = row.action_url ? this.absoluteUrl(row.action_url) : this.appUrl;
            return `<li style="margin-bottom:16px"><strong>${this.escape(row.subject)}</strong><br/>${this.escape(row.body)}<br/><a href="${this.escape(link)}">View</a></li>`;
        }).join('');
        return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><h2>Your DevSocial updates</h2><ul>${items}</ul></div>`;
    }

    private absoluteUrl(path: string) {
        if (/^https?:\/\//i.test(path)) return path;
        if (path.startsWith('/@')) return `${this.appUrl}/${path.slice(1)}`;
        return `${this.appUrl}${path.startsWith('/') ? path : `/${path}`}`;
    }

    private escape(value: string) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}
