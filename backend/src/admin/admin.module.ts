import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { RolesGuard } from './guards/roles.guard';
import { SupabaseModule } from '../common/supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [AdminController],
  providers: [AdminService, RolesGuard],
  exports: [AdminService, RolesGuard],
})
export class AdminModule {}
