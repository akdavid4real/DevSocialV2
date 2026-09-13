import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ReferralsModule } from '../referrals/referrals.module';
import { PrismaModule } from '../common/prisma/prisma.module';
import { SupabaseModule } from '../common/supabase/supabase.module';

@Module({
  imports: [ReferralsModule, PrismaModule, SupabaseModule],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
