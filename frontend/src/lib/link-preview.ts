import api from "@/lib/api"

export interface LinkPreview {
    title: string
    description: string
    image: string
    url: string
    siteName: string
}

export async function getLinkPreview(url: string) {
    return api.post<any, LinkPreview>("/link-preview", { url })
}

export function extractFirstUrl(text: string) {
    const match = text.match(/https?:\/\/[^\s<>"']+/i)
    return match?.[0] || ""
}
