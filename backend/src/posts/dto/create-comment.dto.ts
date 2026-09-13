import { IsString, IsOptional, IsArray, MaxLength, IsUUID } from 'class-validator';

export class CreateCommentDto {
    @IsString()
    @MaxLength(500, { message: 'Comment cannot exceed 500 characters' })
    content: string;

    @IsUUID()
    @IsOptional()
    parentId?: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    imageUrls?: string[];

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    videoUrls?: string[];
}
