import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"

export type CareerDifficulty = "beginner" | "intermediate" | "advanced"

export type CareerLessonBlock =
    | { type: "paragraph"; content: string }
    | { type: "list"; items: string[] }
    | { type: "code"; language: string; code: string }

export type CareerModule = {
    id: string
    title: string
    description: string
    duration: string
    difficulty: CareerDifficulty
    outcomes: string[]
    lesson: CareerLessonBlock[]
    exercise: string
    resources: Array<{ label: string; href: string }>
}

export type CareerPath = {
    id: string
    title: string
    subtitle: string
    description: string
    difficulty: CareerDifficulty
    duration: string
    roleFocus: string
    skills: string[]
    modules: CareerModule[]
}

export function useCareerPaths() {
    return useQuery({
        queryKey: ["career-paths"],
        queryFn: async () => {
            const response = await api.get<unknown, { data: CareerPath[] }>("/career-paths")
            return response.data
        },
    })
}

export function useCareerPath(pathId: string) {
    return useQuery({
        queryKey: ["career-paths", pathId],
        enabled: Boolean(pathId),
        queryFn: async () => {
            const response = await api.get<unknown, { data: CareerPath }>(`/career-paths/${encodeURIComponent(pathId)}`)
            return response.data
        },
    })
}

export function getAdjacentModules(path: CareerPath | undefined, moduleId: string) {
    const modules = path?.modules ?? []
    const index = modules.findIndex((module) => module.id === moduleId)
    return {
        previous: index > 0 ? modules[index - 1] : undefined,
        next: index >= 0 && index < modules.length - 1 ? modules[index + 1] : undefined,
    }
}

export function formatDifficulty(difficulty: CareerDifficulty) {
    return difficulty.charAt(0).toUpperCase() + difficulty.slice(1)
}
