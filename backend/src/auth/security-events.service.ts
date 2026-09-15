import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export type SecurityEventType =
    | 'LOGIN'
    | 'PASSWORD_CHANGED'
    | 'SESSION_REVOKED'
    | 'ALL_SESSIONS_REVOKED'
    | 'ACCOUNT_DELETION_REQUESTED';

@Injectable()
export class SecurityEventsService {
    constructor(private readonly prisma: PrismaService) {}

    async record(input: {
        userId: string;
        eventType: SecurityEventType;
        sessionId?: string | null;
        ipAddress?: string | null;
        userAgent?: string | null;
        metadata?: Record<string, unknown>;
    }) {
        await this.prisma.$executeRaw`
            INSERT INTO public.security_events
                (user_id, event_type, session_id, ip_address, user_agent, metadata)
            VALUES
                (${input.userId}::uuid,
                 ${input.eventType},
                 ${input.sessionId || null},
                 ${input.ipAddress || null},
                 ${input.userAgent || null},
                 ${JSON.stringify(input.metadata || {})}::jsonb)
        `;
    }

    async getStats(userId: string) {
        const [summaryRows, loginRows, latestRows] = await Promise.all([
            this.prisma.$queryRaw<Array<{
                last_login: Date | null;
                last_password_change: Date | null;
                total_logins: bigint;
            }>>`
                SELECT
                    MAX(created_at) FILTER (WHERE event_type = 'LOGIN') AS last_login,
                    MAX(created_at) FILTER (WHERE event_type = 'PASSWORD_CHANGED') AS last_password_change,
                    COUNT(*) FILTER (WHERE event_type = 'LOGIN')::bigint AS total_logins
                FROM public.security_events
                WHERE user_id = ${userId}::uuid
            `,
            this.prisma.$queryRaw<Array<{
                created_at: Date;
                ip_address: string | null;
                user_agent: string | null;
                session_id: string | null;
            }>>`
                SELECT created_at, ip_address, user_agent, session_id
                FROM public.security_events
                WHERE user_id = ${userId}::uuid AND event_type = 'LOGIN'
                ORDER BY created_at DESC
                LIMIT 10
            `,
            this.prisma.$queryRaw<Array<{
                event_type: SecurityEventType;
                created_at: Date;
                ip_address: string | null;
                user_agent: string | null;
                session_id: string | null;
            }>>`
                SELECT event_type, created_at, ip_address, user_agent, session_id
                FROM public.security_events
                WHERE user_id = ${userId}::uuid
                ORDER BY created_at DESC
                LIMIT 20
            `,
        ]);

        const summary = summaryRows[0];
        return {
            lastLogin: summary?.last_login || null,
            lastPasswordChange: summary?.last_password_change || null,
            totalLogins: Number(summary?.total_logins || 0),
            recentLogins: loginRows.map((row) => ({
                createdAt: row.created_at,
                ipAddress: row.ip_address,
                userAgent: row.user_agent,
                sessionId: row.session_id,
            })),
            recentEvents: latestRows.map((row) => ({
                type: row.event_type,
                createdAt: row.created_at,
                ipAddress: row.ip_address,
                userAgent: row.user_agent,
                sessionId: row.session_id,
            })),
        };
    }
}
