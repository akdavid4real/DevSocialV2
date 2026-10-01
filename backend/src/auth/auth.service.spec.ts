import { ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { SupabaseService } from '../common/supabase/supabase.service';
import { ReferralsService } from '../referrals/referrals.service';

describe('Development email verification', () => {
  const email = 'developer@example.test';
  let config: Record<string, string>;
  let prisma: { user: { findUnique: jest.Mock; update: jest.Mock } };
  let updateUserById: jest.Mock;
  let service: AuthService;

  beforeEach(() => {
    config = { NODE_ENV: 'development', DEV_AUTH_TEST_EMAIL: email };
    prisma = { user: {
      findUnique: jest.fn().mockResolvedValue({ id: 'local-user', supabaseAuthId: 'auth-user' }),
      update: jest.fn().mockResolvedValue({}),
    } };
    updateUserById = jest.fn().mockResolvedValue({ error: null });
    service = new AuthService(
      prisma as unknown as PrismaService,
      { client: { auth: { admin: { updateUserById } } } } as unknown as SupabaseService,
      { get: (key: string) => config[key] } as ConfigService,
      {} as ReferralsService,
    );
  });

  it.each(['production', 'test', ''])('rejects outside development (%s)', async (environment) => {
    config.NODE_ENV = environment;
    await expect(service.devVerifyUser(email)).rejects.toBeInstanceOf(ForbiddenException);
    expect(updateUserById).not.toHaveBeenCalled();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('requires explicit opt-in', async () => {
    delete config.DEV_AUTH_TEST_EMAIL;
    await expect(service.devVerifyUser(email)).rejects.toBeInstanceOf(ForbiddenException);
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it.each(['someone@example.test', undefined])('rejects other or missing emails (%s)', async (otherEmail) => {
    await expect(service.devVerifyUser(otherEmail as string)).rejects.toBeInstanceOf(ForbiddenException);
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it('confirms only the configured account in Supabase and the database', async () => {
    await service.devVerifyUser('  DEVELOPER@example.test ');
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email } });
    expect(updateUserById).toHaveBeenCalledWith('auth-user', { email_confirm: true });
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'local-user' }, data: { isVerified: true } });
  });

  it('does not mark the profile verified when Supabase fails', async () => {
    updateUserById.mockResolvedValue({ error: { message: 'Connection failed' } });
    await expect(service.devVerifyUser(email)).rejects.toBeInstanceOf(InternalServerErrorException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
