import { UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

function makeToken(payload: Record<string, unknown>) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `header.${encoded}.signature`;
}

function makeContext(token: string) {
  const request: any = {
    headers: { authorization: `Bearer ${token}` },
  };

  const context: any = {
    switchToHttp: () => ({ getRequest: () => request }),
  };

  return { request, context };
}

describe('JwtAuthGuard', () => {
  const authUserId = '11111111-1111-1111-1111-111111111111';
  const sessionId = '22222222-2222-2222-2222-222222222222';
  const localUser = {
    id: '33333333-3333-3333-3333-333333333333',
    supabaseAuthId: authUserId,
    username: 'david',
    isBlocked: false,
  };

  function createGuard(activeSession = true, user: any = localUser) {
    const supabase: any = {
      client: {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: authUserId } },
            error: null,
          }),
        },
      },
    };

    const prisma: any = {
      $queryRaw: jest.fn().mockResolvedValue(activeSession ? [{ id: sessionId }] : []),
      user: { findUnique: jest.fn().mockResolvedValue(user) },
    };

    return new JwtAuthGuard(supabase, prisma);
  }

  it('accepts a live Supabase session and attaches the current DB user', async () => {
    const token = makeToken({ session_id: sessionId, sub: authUserId });
    const { request, context } = makeContext(token);
    const guard = createGuard();

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual(localUser);
    expect(request.authToken).toBe(token);
    expect(request.authSessionId).toBe(sessionId);
  });

  it('rejects a token immediately when its Supabase session was revoked', async () => {
    const token = makeToken({ session_id: sessionId, sub: authUserId });
    const { context } = makeContext(token);
    const guard = createGuard(false);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects blocked users even when the session itself is still live', async () => {
    const token = makeToken({ session_id: sessionId, sub: authUserId });
    const { context } = makeContext(token);
    const guard = createGuard(true, { ...localUser, isBlocked: true });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
