import { useEffect } from 'react'
import { type DimensionValue } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated'
import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  width?: DimensionValue
  height?: DimensionValue
}

export function Skeleton({ className, width, height }: SkeletonProps) {
  const opacity = useSharedValue(0.3)

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.7, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    )
  }, [])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }))

  return (
    <Animated.View
      style={[animatedStyle, { width, height }]}
      className={cn('bg-surface-elevated rounded-lg', className)}
    />
  )
}
