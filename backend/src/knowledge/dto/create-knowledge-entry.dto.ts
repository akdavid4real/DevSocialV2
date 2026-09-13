import { IsArray, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export const KNOWLEDGE_CATEGORIES = [
    'TUTORIAL',
    'CODE_SNIPPET',
    'BEST_PRACTICE',
    'TROUBLESHOOTING',
    'CONFIGURATION',
    'API_REFERENCE',
    'COMMAND_REFERENCE',
    'QUICK_TIP',
] as const;

export class CreateKnowledgeEntryDto {
    @IsString()
    @MinLength(3)
    @MaxLength(200)
    title: string;

    @IsString()
    @MinLength(2)
    technology: string;

    @IsString()
    @IsIn(KNOWLEDGE_CATEGORIES)
    category: string;

    @IsString()
    @MinLength(20)
    content: string;

    @IsString()
    @IsOptional()
    codeExample?: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    tags?: string[];
}
