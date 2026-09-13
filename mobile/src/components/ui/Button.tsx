import { Pressable, Text, ActivityIndicator, type PressableProps } from 'react-native'
import { cn } from '@/lib/utils'

interface ButtonProps extends PressableProps {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: React.ReactNode
  className?: string
  textClassName?: string
}

export function Button({
  variant = 'default',
  size = 'md',
  loading = false,
  disabled,
  children,
  className,
  textClassName,
  ...props
}: ButtonProps) {
  const baseStyles = 'flex-row items-center justify-center rounded-xl'
  const variantStyles = {
    default: 'bg-primary',
    outline: 'border border-border bg-transparent',
    ghost: 'bg-transparent',
    destructive: 'bg-destructive',
    secondary: 'bg-surface-elevated',
  }
  const sizeStyles = {
    sm: 'px-3 py-2',
    md: 'px-5 py-3',
    lg: 'px-6 py-4',
  }
  const textBase = 'font-semibold text-center'
  const textVariant = {
    default: 'text-white',
    outline: 'text-text-primary',
    ghost: 'text-text-primary',
    destructive: 'text-white',
    secondary: 'text-text-primary',
  }
  const textSize = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  }

  const isDisabled = disabled || loading

  return (
    <Pressable
      className={cn(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        isDisabled && 'opacity-50',
        className
      )}
      disabled={isDisabled}
      {...props}
    >
      {loading && <ActivityIndicator size="small" color="#fff" className="mr-2" />}
      {typeof children === 'string' ? (
        <Text className={cn(textBase, textVariant[variant], textSize[size], textClassName)}>
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  )
}
