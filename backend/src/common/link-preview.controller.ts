import { BadRequestException, Body, Controller, Post } from '@nestjs/common';

type LinkPreviewResult = {
  title: string;
  description: string;
  image: string;
  url: string;
  siteName: string;
};

@Controller('link-preview')
export class LinkPreviewController {
  @Post()
  async createPreview(@Body('url') rawUrl?: string): Promise<LinkPreviewResult> {
    const url = this.parseUrl(rawUrl);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; DevSocial/2.0; +https://devsocial.com)',
          Accept: 'text/html,application/xhtml+xml',
        },
      });

      if (!response.ok) {
        throw new BadRequestException('Unable to fetch link preview');
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) {
        throw new BadRequestException('URL does not point to an HTML page');
      }

      const html = (await response.text()).slice(0, 250_000);
      const title = this.getMetaContent(html, 'og:title')
        || this.getMetaContent(html, 'twitter:title')
        || this.getTitle(html)
        || url.hostname;
      const description = this.getMetaContent(html, 'og:description')
        || this.getMetaContent(html, 'twitter:description')
        || this.getMetaContent(html, 'description')
        || '';
      const image = this.toAbsoluteUrl(
        this.getMetaContent(html, 'og:image') || this.getMetaContent(html, 'twitter:image') || '',
        url,
      );
      const siteName = this.getMetaContent(html, 'og:site_name') || url.hostname.replace(/^www\./, '');

      return {
        title: this.clean(title),
        description: this.clean(description),
        image,
        url: url.toString(),
        siteName: this.clean(siteName),
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Failed to fetch link preview');
    } finally {
      clearTimeout(timeout);
    }
  }

  private parseUrl(rawUrl?: string) {
    if (!rawUrl) {
      throw new BadRequestException('URL is required');
    }

    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      throw new BadRequestException('Invalid URL');
    }

    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new BadRequestException('Only HTTP and HTTPS URLs are supported');
    }

    return url;
  }

  private getMetaContent(html: string, property: string) {
    const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patterns = [
      new RegExp(`<meta[^>]*(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']*)["'][^>]*>`, 'i'),
      new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${escaped}["'][^>]*>`, 'i'),
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) return match[1];
    }

    return '';
  }

  private getTitle(html: string) {
    return html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || '';
  }

  private clean(value: string) {
    return value.replace(/\s+/g, ' ').trim();
  }

  private toAbsoluteUrl(value: string, base: URL) {
    if (!value) return '';
    try {
      return new URL(value, base).toString();
    } catch {
      return '';
    }
  }
}
