import { IsBoolean, IsIn, IsOptional } from 'class-validator';

export class UpdateAppearanceSettingsDto {
    @IsIn(['light', 'dark', 'system'])
    @IsOptional()
    theme?: 'light' | 'dark' | 'system';

    @IsIn(['small', 'medium', 'large'])
    @IsOptional()
    fontSize?: 'small' | 'medium' | 'large';

    @IsBoolean()
    @IsOptional()
    compactMode?: boolean;

    @IsBoolean()
    @IsOptional()
    highContrast?: boolean;

    @IsBoolean()
    @IsOptional()
    reducedMotion?: boolean;

    @IsIn(['vibrant', 'classic'])
    @IsOptional()
    colorTheme?: 'vibrant' | 'classic';

    @IsBoolean()
    @IsOptional()
    sidebarCollapsed?: boolean;

    @IsBoolean()
    @IsOptional()
    showAvatars?: boolean;
}
