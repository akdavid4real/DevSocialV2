import Link from "@/components/ui/link"

export default function UnavailableFeature({ title, description }: { title: string; description: string }) {
    return (
        <section className="mx-auto max-w-xl space-y-4 p-8 text-center">
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="text-muted-foreground">{description}</p>
            <Link href="/" className="inline-block rounded-lg bg-primary px-4 py-2 text-primary-foreground">
                Back to home
            </Link>
        </section>
    )
}
