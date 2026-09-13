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

export const CAREER_PATHS: CareerPath[] = [
    {
        id: "frontend-developer",
        title: "Frontend Developer",
        subtitle: "Build accessible, responsive product interfaces.",
        description: "A practical route through HTML, CSS, JavaScript, React, TypeScript, state, testing, and deployment.",
        difficulty: "beginner",
        duration: "12 weeks",
        roleFocus: "Frontend engineer, UI engineer, React developer",
        skills: ["HTML", "CSS", "JavaScript", "React", "TypeScript", "Testing", "Vite"],
        modules: [
            {
                id: "html-basics",
                title: "HTML foundations",
                description: "Structure pages with semantic elements, links, forms, and accessible document flow.",
                duration: "4 hours",
                difficulty: "beginner",
                outcomes: ["Choose semantic elements", "Build form layouts", "Use accessible labels and landmarks"],
                lesson: [
                    { type: "paragraph", content: "HTML describes the structure and meaning of a page. Strong frontend work starts with correct elements before styling or JavaScript is added." },
                    { type: "list", items: ["Use headings in document order.", "Prefer buttons for actions and links for navigation.", "Connect every input to a visible label."] },
                    {
                        type: "code",
                        language: "html",
                        code: `<main>
  <section aria-labelledby="profile-heading">
    <h1 id="profile-heading">Developer profile</h1>
    <form>
      <label for="stack">Primary stack</label>
      <input id="stack" name="stack" autocomplete="organization-title" />
      <button type="submit">Save</button>
    </form>
  </section>
</main>`,
                    },
                ],
                exercise: "Create a profile settings form with name, role, portfolio URL, and a submit button using semantic HTML.",
                resources: [{ label: "MDN HTML guide", href: "https://developer.mozilla.org/en-US/docs/Learn/HTML" }],
            },
            {
                id: "css-layout",
                title: "CSS layout systems",
                description: "Use flow, flexbox, grid, spacing, and responsive constraints to create stable screens.",
                duration: "6 hours",
                difficulty: "beginner",
                outcomes: ["Build flex and grid layouts", "Set responsive constraints", "Avoid layout shift"],
                lesson: [
                    { type: "paragraph", content: "CSS layout is about constraints. Decide what should grow, shrink, wrap, or stay fixed before adding visual polish." },
                    { type: "list", items: ["Use flexbox for one-dimensional alignment.", "Use grid when both rows and columns matter.", "Use max-width and minmax to keep content readable."] },
                    {
                        type: "code",
                        language: "css",
                        code: `.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
}`,
                    },
                ],
                exercise: "Build a responsive three-card skills grid that wraps cleanly from desktop to mobile.",
                resources: [{ label: "MDN CSS layout", href: "https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout" }],
            },
            {
                id: "javascript-core",
                title: "JavaScript core",
                description: "Understand values, functions, arrays, objects, async work, and DOM events.",
                duration: "10 hours",
                difficulty: "beginner",
                outcomes: ["Transform arrays", "Handle user events", "Use async functions safely"],
                lesson: [
                    { type: "paragraph", content: "Modern frontend applications are built from predictable data transformations and clear event handling. Keep state changes explicit and small." },
                    {
                        type: "code",
                        language: "ts",
                        code: `const activeTasks = tasks
  .filter((task) => !task.done)
  .map((task) => ({ ...task, label: task.title.trim() }))`,
                    },
                    { type: "list", items: ["Avoid mutating shared objects in UI state.", "Handle failed async calls visibly.", "Keep DOM event handlers short."] },
                ],
                exercise: "Create a task filter that supports all, active, and completed states without mutating the original array.",
                resources: [{ label: "MDN JavaScript guide", href: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide" }],
            },
            {
                id: "react-components",
                title: "React components",
                description: "Compose product screens with props, state, effects, and reusable UI boundaries.",
                duration: "12 hours",
                difficulty: "intermediate",
                outcomes: ["Split reusable components", "Manage component state", "Use effects for external synchronization"],
                lesson: [
                    { type: "paragraph", content: "React components should describe UI from state. Use props for inputs, state for local interaction, and effects only when synchronizing with something outside React." },
                    {
                        type: "code",
                        language: "tsx",
                        code: `function SkillBadge({ skill }: { skill: string }) {
  return <span className="rounded-md border px-2 py-1 text-sm">{skill}</span>
}`,
                    },
                    { type: "list", items: ["Lift state only when multiple components need it.", "Keep rendering pure.", "Extract components when a boundary has a clear purpose."] },
                ],
                exercise: "Build a reusable developer card with name, skills, level, and a follow button.",
                resources: [{ label: "React learning docs", href: "https://react.dev/learn" }],
            },
            {
                id: "typescript-ui",
                title: "TypeScript for UI",
                description: "Model props, API responses, route params, and form state without falling back to unsafe casts.",
                duration: "8 hours",
                difficulty: "intermediate",
                outcomes: ["Type component props", "Represent loading states", "Narrow unknown errors"],
                lesson: [
                    { type: "paragraph", content: "TypeScript is most useful in UI work when it models real states. Loading, empty, success, and failure states should be explicit in code." },
                    {
                        type: "code",
                        language: "ts",
                        code: `type LoadState<T> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "error"; message: string }`,
                    },
                    { type: "list", items: ["Prefer specific prop types over any.", "Use discriminated unions for UI states.", "Keep API response types close to the API client."] },
                ],
                exercise: "Refactor a list view to use a typed loading, ready, empty, and error state.",
                resources: [{ label: "TypeScript handbook", href: "https://www.typescriptlang.org/docs/" }],
            },
        ],
    },
    {
        id: "backend-developer",
        title: "Backend Developer",
        subtitle: "Design APIs, data models, and reliable services.",
        description: "A server-side path covering HTTP, validation, auth, databases, queues, testing, and deployment discipline.",
        difficulty: "intermediate",
        duration: "14 weeks",
        roleFocus: "Backend engineer, API engineer, platform developer",
        skills: ["Node.js", "NestJS", "PostgreSQL", "Prisma", "Auth", "Testing"],
        modules: [
            createCompactModule("http-api-design", "HTTP API design", "Model resources, request validation, errors, and status codes.", "Define a posts API contract with list, create, update, and delete endpoints."),
            createCompactModule("database-modeling", "Database modeling", "Design relational tables, indexes, constraints, and migrations.", "Sketch a schema for projects, contributors, and project updates."),
            createCompactModule("auth-permissions", "Auth and permissions", "Protect routes with identity, roles, and ownership checks.", "Write authorization rules for editing a project and moderating reports."),
        ],
    },
    {
        id: "fullstack-developer",
        title: "Fullstack Developer",
        subtitle: "Own product slices from interface to database.",
        description: "Connect frontend state, API contracts, validation, data access, background work, and release checks.",
        difficulty: "intermediate",
        duration: "16 weeks",
        roleFocus: "Fullstack engineer, product engineer",
        skills: ["React", "TypeScript", "NestJS", "Prisma", "Testing", "Deployment"],
        modules: [
            createCompactModule("product-slice-planning", "Product slice planning", "Break a feature into UI, API, data, and verification work.", "Plan a feedback feature from screen states through database tables."),
            createCompactModule("contract-first-forms", "Contract-first forms", "Keep frontend forms aligned with backend validation and response shapes.", "Build a typed form contract for creating a community."),
            createCompactModule("release-verification", "Release verification", "Run focused checks that prove the user workflow works end to end.", "Write a release checklist for a referral signup flow."),
        ],
    },
    {
        id: "ai-product-developer",
        title: "AI Product Developer",
        subtitle: "Build useful AI workflows into developer products.",
        description: "Learn prompt boundaries, retrieval, evaluation, guardrails, observability, and product integration.",
        difficulty: "advanced",
        duration: "10 weeks",
        roleFocus: "AI product engineer, applied AI developer",
        skills: ["Prompting", "RAG", "Evaluation", "TypeScript", "APIs", "Observability"],
        modules: [
            createCompactModule("workflow-design", "AI workflow design", "Identify the user job, model inputs, outputs, and fallback behavior.", "Design an AI helper that summarizes a project issue without overwriting user content."),
            createCompactModule("retrieval-basics", "Retrieval basics", "Ground model answers with indexed project data and citations.", "Define chunks and metadata for a knowledge-bank assistant."),
            createCompactModule("evaluation-loops", "Evaluation loops", "Create test cases that catch bad answers before release.", "Write five evaluation cases for a code-review assistant."),
        ],
    },
]

function createCompactModule(id: string, title: string, description: string, exercise: string): CareerModule {
    return {
        id,
        title,
        description,
        duration: "5 hours",
        difficulty: "intermediate",
        outcomes: ["Explain the core concept", "Apply it in a product feature", "Define a verification check"],
        lesson: [
            { type: "paragraph", content: description },
            { type: "list", items: ["Start from the user workflow.", "Make the contract explicit.", "Verify the behavior with a focused check."] },
        ],
        exercise,
        resources: [{ label: "DevSocial Knowledge Bank", href: "/knowledge-bank" }],
    }
}

export function getCareerPaths() {
    return CAREER_PATHS
}

export function getCareerPath(pathId: string) {
    return CAREER_PATHS.find((path) => path.id === pathId)
}

export function getCareerModule(pathId: string, moduleId: string) {
    return getCareerPath(pathId)?.modules.find((module) => module.id === moduleId)
}

export function getAdjacentModules(pathId: string, moduleId: string) {
    const modules = getCareerPath(pathId)?.modules ?? []
    const index = modules.findIndex((module) => module.id === moduleId)
    return {
        previous: index > 0 ? modules[index - 1] : undefined,
        next: index >= 0 && index < modules.length - 1 ? modules[index + 1] : undefined,
    }
}

export function formatDifficulty(difficulty: CareerDifficulty) {
    return difficulty.charAt(0).toUpperCase() + difficulty.slice(1)
}
