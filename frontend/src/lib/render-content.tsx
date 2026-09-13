import Link from "@/components/ui/link"

/**
 * Parses a string and wraps @mentions and #hashtags in Link components.
 */
export function renderContent(content: string) {
    if (!content) return null

    // Regex to split by mentions (@username) and hashtags (#tag)
    // Captures the separators so they are included in the split array
    const parts = content.split(/([@#][a-zA-Z0-9_-]+)/g)

    return parts.map((part, index) => {
        if (part.startsWith("@")) {
            const username = part.slice(1)
            return (
                <Link
                    key={index}
                    href={`/@${username}`}
                    className="text-primary hover:underline font-bold transition-all"
                    onClick={(e) => e.stopPropagation()}
                >
                    {part}
                </Link>
            )
        }

        if (part.startsWith("#")) {
            const tag = part.slice(1)
            return (
                <Link
                    key={index}
                    href={`/tag/${tag}`}
                    className="text-primary/70 hover:underline font-medium transition-all"
                    onClick={(e) => e.stopPropagation()}
                >
                    {part}
                </Link>
            )
        }

        return part
    })
}
