import { TextInput, View, Text, type TextInputProps } from 'react-native'
import { cn } from '@/lib/utils'

interface InputProps extends TextInputProps {
  label?: string
  error?: string
  containerClassName?: string
}

export function Input({
  label,
  error,
  className,
  containerClassName,
  ...props
}: InputProps) {
  return (
    <View className={cn('w-full', containerClassName)}>
      {label && (
        <Text className="text-sm font-medium text-text-primary mb-1.5">{label}</Text>
      )}
      <TextInput
        className={cn(
          'w-full bg-surface border border-border rounded-xl px-4 py-3 text-text-primary text-base',
          error && 'border-destructive',
          className
        )}
        placeholderTextColor="#71717A"
        {...props}
      />
      {error && (
        <Text className="text-sm text-destructive mt-1">{error}</Text>
      )}
    </View>
  )
}
