/**
 * Shared Component Variants
 *
 * Centralized CVA variants for common UI patterns.
 * Import these to maintain consistency across the app.
 */

import { cva, type VariantProps } from "class-variance-authority"

/**
 * Card Variants
 *
 * Usage:
 * <div className={cardVariants({ variant: "default" })}>...</div>
 */
export const cardVariants = cva(
  "rounded-3xl border overflow-hidden transition-colors duration-300",
  {
    variants: {
      variant: {
        // Standard solid card (preferred for most use cases)
        default: "bg-card border-border hover:bg-card/80",

        // Subtle transparent card (use for nested content)
        subtle: "bg-white/[0.03] border-white/5 hover:bg-white/[0.05]",

        // Glass card (ONLY for modals, overlays, floating elements)
        glass: "bg-background/60 backdrop-blur-xl border-white/10 shadow-xl",

        // Elevated card with shadow
        elevated: "bg-card border-border shadow-lg hover:shadow-xl",
      },
      padding: {
        none: "p-0",
        sm: "p-4",
        md: "p-5 sm:p-6",
        lg: "p-6 sm:p-8",
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "md",
    },
  }
)

/**
 * Container Variants
 *
 * For page sections and layout containers
 */
export const containerVariants = cva(
  "w-full mx-auto",
  {
    variants: {
      size: {
        sm: "max-w-2xl",
        md: "max-w-4xl",
        lg: "max-w-6xl",
        xl: "max-w-7xl",
        full: "max-w-full",
      },
      padding: {
        none: "px-0",
        sm: "px-4",
        md: "px-4 sm:px-6",
        lg: "px-4 sm:px-6 lg:px-8",
      },
    },
    defaultVariants: {
      size: "xl",
      padding: "md",
    },
  }
)

/**
 * Text Variants
 *
 * Standardized text styles for consistency
 */
export const textVariants = cva(
  "",
  {
    variants: {
      variant: {
        // Headings
        h1: "text-3xl sm:text-4xl font-bold tracking-tight",
        h2: "text-2xl sm:text-3xl font-bold tracking-tight",
        h3: "text-xl sm:text-2xl font-bold tracking-tight",
        h4: "text-lg sm:text-xl font-bold tracking-tight",

        // Body text
        body: "text-base font-medium leading-relaxed",
        bodySmall: "text-sm font-medium leading-relaxed",

        // Labels (can be uppercase)
        label: "text-xs font-semibold uppercase tracking-widest",
        labelLarge: "text-sm font-semibold uppercase tracking-wide",

        // Metadata/captions
        caption: "text-xs font-medium",
        muted: "text-xs font-medium text-muted-foreground/60",
      },
    },
    defaultVariants: {
      variant: "body",
    },
  }
)

/**
 * Badge Variants (Extended)
 *
 * Additional badge styles beyond the base component
 */
export const extendedBadgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-widest transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary/10 text-primary border border-primary/20",
        secondary: "bg-secondary/10 text-secondary border border-secondary/20",
        success: "bg-green-500/10 text-green-500 border border-green-500/20",
        warning: "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20",
        error: "bg-red-500/10 text-red-500 border border-red-500/20",
        neutral: "bg-muted text-muted-foreground border border-border",
      },
      size: {
        sm: "text-[10px] px-2 py-0.5",
        md: "text-xs px-2.5 py-0.5",
        lg: "text-sm px-3 py-1",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

/**
 * Avatar Variants (Standardized Sizes)
 */
export const avatarVariants = cva(
  "rounded-full border-2 border-primary/20 shadow-lg overflow-hidden",
  {
    variants: {
      size: {
        xs: "h-6 w-6",
        sm: "h-8 w-8",
        md: "h-10 w-10",
        default: "h-11 w-11",
        lg: "h-16 w-16",
        xl: "h-24 w-24",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

/**
 * Input Variants (Form Fields)
 */
export const inputVariants = cva(
  "w-full rounded-xl border bg-background px-4 py-2.5 text-sm font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-input focus:border-primary focus:ring-2 focus:ring-primary/20",
        error: "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20",
        success: "border-green-500 focus:border-green-500 focus:ring-2 focus:ring-green-500/20",
      },
      inputSize: {
        sm: "h-9 px-3 py-2 text-xs",
        md: "h-10 px-4 py-2.5 text-sm",
        lg: "h-12 px-5 py-3 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      inputSize: "md",
    },
  }
)

/**
 * Icon Button Variants
 */
export const iconButtonVariants = cva(
  "inline-flex items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        outline: "border border-input bg-background hover:bg-accent",
      },
      size: {
        sm: "h-8 w-8",
        md: "h-10 w-10",
        lg: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "ghost",
      size: "md",
    },
  }
)

/**
 * Skeleton Variants (Loading States)
 */
export const skeletonVariants = cva(
  "animate-pulse rounded-xl bg-muted",
  {
    variants: {
      variant: {
        default: "bg-muted",
        shimmer: "bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%] animate-shimmer",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

/**
 * Dropdown/Menu Item Variants
 */
export const menuItemVariants = cva(
  "relative flex cursor-pointer select-none items-center rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-widest outline-none transition-colors",
  {
    variants: {
      variant: {
        default: "focus:bg-accent focus:text-accent-foreground",
        destructive: "focus:bg-red-500/20 focus:text-red-500 text-red-500/80",
        primary: "focus:bg-primary/20 focus:text-primary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

/**
 * Stats Card Variants
 */
export const statsCardVariants = cva(
  "rounded-2xl border p-4 sm:p-6 transition-colors",
  {
    variants: {
      variant: {
        default: "bg-card border-border hover:bg-card/80",
        primary: "bg-primary/5 border-primary/20 hover:bg-primary/10",
        success: "bg-green-500/5 border-green-500/20 hover:bg-green-500/10",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

// Export types for component props
export type CardVariants = VariantProps<typeof cardVariants>
export type ContainerVariants = VariantProps<typeof containerVariants>
export type TextVariants = VariantProps<typeof textVariants>
export type ExtendedBadgeVariants = VariantProps<typeof extendedBadgeVariants>
export type AvatarVariants = VariantProps<typeof avatarVariants>
export type InputVariants = VariantProps<typeof inputVariants>
export type IconButtonVariants = VariantProps<typeof iconButtonVariants>
export type SkeletonVariants = VariantProps<typeof skeletonVariants>
export type MenuItemVariants = VariantProps<typeof menuItemVariants>
export type StatsCardVariants = VariantProps<typeof statsCardVariants>
