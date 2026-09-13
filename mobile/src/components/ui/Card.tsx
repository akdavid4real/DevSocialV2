import { View, Text, type ViewProps } from 'react-native'
import { cn } from '@/lib/utils'

interface CardProps extends ViewProps {
  className?: string
  children: React.ReactNode
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <View
      className={cn('bg-surface border border-border rounded-2xl', className)}
      {...props}
    >
      {children}
    </View>
  )
}

export function CardHeader({ className, children, ...props }: CardProps) {
  return (
    <View className={cn('p-5 pb-2', className)} {...props}>
      {children}
    </View>
  )
}

export function CardContent({ className, children, ...props }: CardProps) {
  return (
    <View className={cn('p-5 pt-2', className)} {...props}>
      {children}
    </View>
  )
}

export function CardFooter({ className, children, ...props }: CardProps) {
  return (
    <View className={cn('p-5 pt-2 border-t border-border', className)} {...props}>
      {children}
    </View>
  )
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Text className={cn('text-xl font-bold text-text-primary', className)}>
      {children}
    </Text>
  )
}

export function CardDescription({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Text className={cn('text-sm text-text-secondary mt-1', className)}>
      {children}
    </Text>
  )
}
