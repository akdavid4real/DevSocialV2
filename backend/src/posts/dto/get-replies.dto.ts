import { IsOptional } from 'class-validator';

export class GetRepliesDto {
    @IsOptional()
    page?: number;

    @IsOptional()
    limit?: number;
}
