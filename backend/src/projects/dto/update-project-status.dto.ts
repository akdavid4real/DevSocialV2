import { IsIn, IsString } from 'class-validator';

export class UpdateProjectStatusDto {
    @IsString()
    @IsIn(['PLANNING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD'])
    status: string;
}
