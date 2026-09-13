import { View, Text } from 'react-native'
import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'secondary' | 'destructive' | 'success' | 'warning'
  className?: string
}

const variantStyles = {
  default: 'bg-primary/20',
  secondary: 'bg-surface-elevated',
  destructive: 'bg-destructive/20',
  success: 'bg-success/20',
  warning: 'bg-warning/20',
}

const textStyles = {
  default: 'text-primary',
  secondary: 'text-text-secondary',
  destructive: 'text-destructive',
  success: 'text-success',
  warning: 'text-warning',
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <View className={cn('px-2.5 py-1 rounded-full', variantStyles[variant], className)}>
      {typeof children === 'string' ? (
        <Text className={cn('text-xs font-semibold', textStyles[variant])}>{children}</Text>
      ) : (
        children
      )}
    </View>
  )
}
