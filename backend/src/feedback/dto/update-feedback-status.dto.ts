import { IsIn, IsString } from 'class-validator';

export const FEEDBACK_STATUSES = ['OPEN', 'IN_PROGRESS', 'SOLVED'] as const;

export class UpdateFeedbackStatusDto {
    @IsString()
    @IsIn(FEEDBACK_STATUSES)
    status: string;
}
