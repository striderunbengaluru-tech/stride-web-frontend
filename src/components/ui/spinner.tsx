import { Loader2 } from 'lucide-react'

export function Spinner({ className = 'w-4 h-4' }: { className?: string }) {
  return <Loader2 className={`${className} animate-spin`} aria-hidden='true' />
}
