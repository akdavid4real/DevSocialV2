import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateOnboardingDto } from './dto/update-onboarding.dto';

@Injectable()
export class OnboardingService {
    private readonly logger = new Logger(OnboardingService.name);

    constructor(private readonly prisma: PrismaService) { }

    async getStatus(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                onboardingCompleted: true,
                gender: true,
                bio: true,
                avatar: true,
                techCareerPath: true,
                techStack: true,
                experienceLevel: true,
                interests: true,
                affiliation: true,
            },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return user;
    }

    async update(userId: string, data: UpdateOnboardingDto) {
        this.logger.log(`Updating onboarding data for user ${userId}`);

        const updateData: any = { ...data };

        // If this is the final step or we want to auto-complete
        // We could check if all required fields are present to mark as completed
        // For simplicity, we'll assume the frontend sends a flag or we check here

        // Let's implement a simple check: if bio, techStack, and interests are provided, 
        // we might consider it almost done. 
        // But usually Step 5 is the final welcome.

        // For now, we update the fields. The frontend will hit this endpoint multiple times.
        const user = await this.prisma.user.update({
            where: { id: userId },
            data: {
                ...updateData,
                // Automatically complete if it's the last step
                // (This could be more robust)
                onboardingCompleted: data.interests && data.interests.length > 0 ? true : false,
            },
        });

        return user;
    }
}
