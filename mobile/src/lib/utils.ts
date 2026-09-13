import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function timeAgo(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function formatCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
  return count.toString()
}

export function getInitials(name?: string, username?: string): string {
  if (name) return name.charAt(0).toUpperCase()
  if (username) return username.charAt(0).toUpperCase()
  return '?'
}

function unwrap(response: any) {
  if (response?.data !== undefined) return response.data
  return response
}

export { unwrap }
