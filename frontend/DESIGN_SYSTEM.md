# DevSocial V2 Design System

**Version:** 2.0
**Last Updated:** 2026-03-20

---

## Table of Contents
1. [Overview](#overview)
2. [Color Palette](#color-palette)
3. [Typography](#typography)
4. [Spacing & Layout](#spacing--layout)
5. [Components](#components)
6. [Effects & Animations](#effects--animations)
7. [Responsive Design](#responsive-design)
8. [Accessibility](#accessibility)

---

## Overview

DevSocial V2 uses a modern, tech-forward design system built on:
- **Tailwind CSS v4** for utility-first styling
- **Radix UI** for accessible component primitives
- **CVA (Class Variance Authority)** for component variants
- **HSL color system** for dynamic theming
- **CSS custom properties** for theme switching

### Design Philosophy
- **Mobile-first** responsive design
- **Accessibility-first** with WCAG AA compliance
- **Performance-conscious** with optimized animations
- **Developer-friendly** with reusable patterns

---

## Color Palette

### Theme System
We support two color themes, each with light and dark modes:

#### 1. Vibrant Theme (Default)
Modern, energetic palette with purple and cyan accents.

**Light Mode:**
```css
--background: 210 40% 98%        /* Off-white */
--foreground: 222 47% 11%        /* Dark blue-gray */
--primary: 262 83% 58%           /* Vibrant purple */
--secondary: 190 90% 50%         /* Bright cyan */
```

**Dark Mode:**
```css
--background: 222 47% 11%        /* Deep blue-gray */
--foreground: 210 40% 98%        /* Off-white */
--primary: 263 70% 50%           /* Rich purple */
--secondary: 160 84% 39%         /* Teal */
```

#### 2. Classic Theme
Traditional, professional palette with green and neutral tones.

**Light Mode:**
```css
--background: 0 0% 100%          /* Pure white */
--foreground: 240 10% 3.9%       /* Near black */
--primary: 142 76% 36%           /* Forest green */
--secondary: 240 4.8% 95.9%      /* Light gray */
```

**Dark Mode:**
```css
--background: 20 14.3% 4.1%      /* Warm dark */
--foreground: 0 0% 95%           /* Off-white */
--primary: 142 70% 50%           /* Bright green */
--secondary: 240 3.7% 15.9%      /* Dark gray */
```

### Semantic Colors
```css
--card: Card backgrounds
--popover: Popover/dropdown backgrounds
--muted: Subtle backgrounds and disabled states
--accent: Hover states and highlights
--destructive: Error states and dangerous actions
--border: Border colors
--input: Input field borders
--ring: Focus ring colors
```

### Usage Guidelines
- Use `bg-background` for page backgrounds
- Use `bg-card` for content containers
- Use `text-foreground` for primary text
- Use `text-muted-foreground` for secondary text (minimum 60% opacity)
- Use `border-border` for all borders
- Use `ring-ring` for focus states

---

## Typography

### Font Families
```typescript
--font-sans: Geist Sans (default)
--font-mono: Geist Mono (code blocks)
```

### Type Scale
| Class | Size | Line Height | Use Case |
|-------|------|-------------|----------|
| `text-xs` | 12px | 1rem | Labels, captions, metadata |
| `text-sm` | 14px | 1.25rem | Small body text, buttons |
| `text-base` | 16px | 1.5rem | Body text, paragraphs |
| `text-lg` | 18px | 1.75rem | Subheadings, emphasis |
| `text-xl` | 20px | 1.75rem | Card titles |
| `text-2xl` | 24px | 2rem | Section headings |
| `text-3xl` | 30px | 2.25rem | Page headings |
| `text-4xl` | 36px | 2.5rem | Hero headings |

### Font Weights
| Weight | Class | Use Case |
|--------|-------|----------|
| 400 | `font-normal` | Unused (prefer medium+) |
| 500 | `font-medium` | Body text, paragraphs |
| 600 | `font-semibold` | Buttons, labels, emphasis |
| 700 | `font-bold` | Headings (h1-h4) |
| 900 | `font-black` | Avoid (too heavy) |

### Typography Rules
1. **Body text:** `text-base font-medium` (16px, 500 weight)
2. **Labels:** `text-xs font-semibold uppercase` (12px, 600 weight)
3. **Headings:** `text-2xl/3xl/4xl font-bold` (700 weight)
4. **Buttons:** `text-sm font-semibold` (14px, 600 weight)
5. **Metadata:** `text-xs font-medium text-muted-foreground/60`

### Text Transform
- **Uppercase:** Use ONLY for labels, buttons, and badges
- **Sentence case:** Use for headings and body text
- **No caps:** Avoid all-caps for long text (>3 words)

---

## Spacing & Layout

### Spacing Scale
Based on Tailwind's default scale (1 unit = 0.25rem = 4px):

| Token | Value | Use Case |
|-------|-------|----------|
| `gap-1` | 4px | Tight icon spacing |
| `gap-2` | 8px | Button icon gaps |
| `gap-3` | 12px | List items |
| `gap-4` | 16px | Card content |
| `gap-6` | 24px | Section spacing |
| `gap-8` | 32px | Layout spacing |

### Border Radius
```css
--radius: 1rem (16px)           /* Base radius (vibrant) */
--radius: 0.5rem (8px)          /* Base radius (classic) */
--radius-lg: var(--radius)
--radius-md: calc(var(--radius) - 2px)
--radius-sm: calc(var(--radius) - 4px)
```

**Usage:**
- `rounded-3xl` (24px): Large cards
- `rounded-2xl` (16px): Medium cards, modals
- `rounded-xl` (12px): Buttons, inputs
- `rounded-full`: Pills, avatars

### Container Widths
```typescript
max-w-7xl  // Main content (1280px)
max-w-2xl  // Forms, modals (672px)
max-w-md   // Small cards (448px)
```

---

## Components

### Card Variants

#### Standard Card (Non-glassmorphic)
```typescript
<Card className="bg-card border-border">
  <CardContent>...</CardContent>
</Card>
```

#### Glass Card (Modals/Overlays Only)
```typescript
<Card className="bg-background/60 backdrop-blur-xl border-white/10">
  <CardContent>...</CardContent>
</Card>
```

### Button Variants
```typescript
// Primary action
<Button variant="default">Create Post</Button>

// Secondary action
<Button variant="secondary">Cancel</Button>

// Destructive action
<Button variant="destructive">Delete</Button>

// Ghost (minimal)
<Button variant="ghost">More</Button>

// Outline
<Button variant="outline">Edit</Button>
```

### Badge Variants
```typescript
// Default
<Badge>Level 5</Badge>

// Outline
<Badge variant="outline">Pro</Badge>

// Destructive
<Badge variant="destructive">Error</Badge>
```

### Avatar Sizes
```typescript
h-8 w-8   // Small (32px) - comments
h-10 w-10 // Medium (40px) - navbar
h-11 w-11 // Default (44px) - posts
h-16 w-16 // Large (64px) - profiles
```

---

## Effects & Animations

### Shadows
```css
/* Elevation levels */
shadow-sm:     0 1px 2px rgba(0,0,0,0.05)
shadow:        0 1px 3px rgba(0,0,0,0.1)
shadow-md:     0 4px 6px rgba(0,0,0,0.1)
shadow-lg:     0 10px 15px rgba(0,0,0,0.1)
shadow-xl:     0 20px 25px rgba(0,0,0,0.1)

/* Colored shadows (accent) */
shadow-primary/20: For primary buttons
shadow-primary/40: For hover states
```

### Transitions
```css
/* Prefer specific properties over transition-all */
transition-colors              // Color changes only
transition-transform           // Scale, translate only
transition-opacity             // Fade in/out
transition-[background-color,border-color]  // Multiple properties
```

### Durations
```css
duration-150  // Quick feedback (hover)
duration-300  // Standard (buttons, colors)
duration-500  // Slow (layout changes)
```

### Backdrop Blur (Use Sparingly)
```css
backdrop-blur-sm   // Subtle (4px) - unused
backdrop-blur-md   // Medium (12px) - unused
backdrop-blur-xl   // Heavy (24px) - modals ONLY
```

**⚠️ Performance Note:** Avoid backdrop-blur on:
- List items
- Regular cards
- Mobile devices (buggy on iOS)

---

## Responsive Design

### Breakpoints
```typescript
sm: 640px   // Mobile landscape, small tablets
md: 768px   // Tablets
lg: 1024px  // Desktop
xl: 1280px  // Large desktop
2xl: 1536px // Extra large desktop
```

### Mobile-First Approach
Always write base styles for mobile, then add breakpoints:

```tsx
// ❌ Wrong (desktop-first)
<div className="grid grid-cols-3 sm:grid-cols-1">

// ✅ Correct (mobile-first)
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
```

### Responsive Patterns

#### Text Sizing
```tsx
<h1 className="text-2xl sm:text-3xl lg:text-4xl">
```

#### Spacing
```tsx
<div className="p-4 sm:p-6 lg:p-8">
```

#### Layout
```tsx
<div className="flex flex-col lg:flex-row gap-4">
```

#### Visibility
```tsx
<button className="hidden lg:flex">Desktop Only</button>
<button className="flex lg:hidden">Mobile Only</button>
```

### Touch Targets
Minimum touch target size: **44px × 44px** (WCAG 2.1)

```tsx
// ✅ Good
<Button size="default" className="h-10">  // 40px (acceptable)
<Button size="lg" className="h-11">       // 44px (ideal)

// ❌ Bad
<Button className="h-6">  // 24px (too small)
```

---

## Accessibility

### Color Contrast
- **Normal text:** Minimum 4.5:1 (WCAG AA)
- **Large text (18px+):** Minimum 3:1 (WCAG AA)
- **Icons:** Minimum 3:1

### Text Opacity Guidelines
```css
100%         // Primary text (foreground)
80-90%       // Body text
60-70%       // Secondary text, metadata
40-50%       // Disabled states, placeholders (use cautiously)
20-30%       // Dividers, subtle borders (avoid for text)
```

### Focus States
All interactive elements must have visible focus:
```tsx
focus-visible:outline-none
focus-visible:ring-2
focus-visible:ring-ring
focus-visible:ring-offset-2
```

### Screen Reader Support
- Use semantic HTML (`<nav>`, `<main>`, `<article>`)
- Add `aria-label` for icon-only buttons
- Use Radix UI components (built-in accessibility)

---

## Implementation Checklist

When creating new components:

- [ ] Use semantic color tokens (not hardcoded colors)
- [ ] Follow type scale (no arbitrary text sizes)
- [ ] Add responsive modifiers (sm:/md:/lg:)
- [ ] Use proper font weights (medium/semibold/bold)
- [ ] Avoid uppercase on body text
- [ ] Add focus states
- [ ] Test color contrast
- [ ] Ensure 44px touch targets on mobile
- [ ] Use specific transitions (not transition-all)
- [ ] Reserve glassmorphism for overlays only

---

## Resources

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Radix UI Components](https://www.radix-ui.com/)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Color Contrast Checker](https://webaim.org/resources/contrastchecker/)

---

**Maintained by:** DevSocial Team
**Questions?** Open an issue or PR with suggestions!
