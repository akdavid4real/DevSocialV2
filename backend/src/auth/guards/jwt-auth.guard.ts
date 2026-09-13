import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SupabaseService } from '../../common/supabase/supabase.service';

function decodeJwtPayload(token: string): Record<string, unknown> {
  const [, payload] = token.split('.');
  if (!payload) {
    throw new UnauthorizedException('Invalid access token');
  }

  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
  } catch {
    throw new UnauthorizedException('Invalid access token');
  }
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization as string | undefined;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing access token');
    }

    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) {
      throw new UnauthorizedException('Missing access token');
    }

    const { data, error } = await this.supabase.client.auth.getUser(token);
    if (error || !data.user) {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    const payload = decodeJwtPayload(token);
    const sessionId = typeof payload.session_id === 'string' ? payload.session_id : null;
    if (!sessionId) {
      throw new UnauthorizedException('Access token is not bound to a Supabase session');
    }

    // Supabase access tokens remain cryptographically valid until their exp time,
    // even after sign-out. Checking auth.sessions makes revocation immediate.
    const activeSessions = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id::text
      FROM auth.sessions
      WHERE id = ${sessionId}::uuid
        AND user_id = ${data.user.id}::uuid
      LIMIT 1
    `;

    if (activeSessions.length === 0) {
      throw new UnauthorizedException('Session has been revoked');
    }

    const user = await this.prisma.user.findUnique({
      where: { supabaseAuthId: data.user.id },
    });

    if (!user) {
      throw new UnauthorizedException('User profile not found');
    }

    if (user.isBlocked) {
      throw new UnauthorizedException('User is blocked');
    }

    request.user = user;
    request.authToken = token;
    request.authSessionId = sessionId;

    return true;
  }
}
