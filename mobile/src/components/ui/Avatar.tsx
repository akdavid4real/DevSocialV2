import { View, Text, Image } from 'react-native'
import { cn, getInitials } from '@/lib/utils'

interface AvatarProps {
  uri?: string | null
  name?: string
  username?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeMap = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-14 h-14',
  xl: 'w-20 h-20',
}

const textSizeMap = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-lg',
  xl: 'text-2xl',
}

export function Avatar({ uri, name, username, size = 'md', className }: AvatarProps) {
  const sizeClass = sizeMap[size]
  const initials = getInitials(name, username)

  if (uri) {
    return (
      <Image
        source={{ uri }}
        className={cn(sizeClass, 'rounded-full', className)}
      />
    )
  }

  return (
    <View
      className={cn(
        sizeClass,
        'rounded-full bg-primary/20 items-center justify-center',
        className
      )}
    >
      <Text className={cn('font-bold text-primary', textSizeMap[size])}>
        {initials}
      </Text>
    </View>
  )
}
