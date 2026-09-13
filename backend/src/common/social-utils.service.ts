import { Injectable } from '@nestjs/common';

@Injectable()
export class SocialUtilsService {
    /**
     * Extracts hashtags from a given text.
     * @param content - The text to extract hashtags from.
     * @returns An array of hashtags (without the # symbol).
     */
    extractHashtags(content: string): string[] {
        if (!content) return [];
        const hashtagRegex = /#[a-zA-Z0-9_]+/g;
        const matches = content.match(hashtagRegex) || [];
        // Remove # and normalize to lowercase
        return [...new Set(matches.map(tag => tag.substring(1).toLowerCase()))];
    }

    /**
     * Extracts mentions from a given text.
     * @param content - The text to extract mentions from.
     * @returns An array of usernames (without the @ symbol).
     */
    extractMentions(content: string): string[] {
        if (!content) return [];
        const mentionRegex = /@(\w+)/g;
        const matches = content.match(mentionRegex) || [];
        // Remove @ and filter out duplicates
        return [...new Set(matches.map(mention => mention.substring(1)))];
    }
}
