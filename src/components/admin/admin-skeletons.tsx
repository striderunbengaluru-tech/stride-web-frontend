// Segment-level skeletons for the admin dashboard. These render inside the
// admin layout's <main> (the nav + backdrop persist), so a link tap paints an
// instant placeholder in the content area while the real page streams in —
// admin navigation never looks dead. Shapes mirror each page's real layout so
// there's no jarring reflow when content arrives.

function Bar({ className = '' }: { className?: string }) {
  return <div className={`rounded bg-white/8 animate-pulse ${className}`} />
}

function AdminHeaderSkeleton() {
  return (
    <div className='flex items-center gap-3 mb-8'>
      <div className='w-9 h-9 rounded-xl bg-white/8 animate-pulse shrink-0' />
      <div className='space-y-2'>
        <Bar className='h-7 w-48' />
        <Bar className='h-3 w-32 bg-white/5' />
      </div>
    </div>
  )
}

// Dashboard: header + 4 stat cards + a 2×2 chart grid.
export function AdminDashboardSkeleton() {
  return (
    <div>
      <AdminHeaderSkeleton />
      <div className='grid grid-cols-2 sm:grid-cols-4 gap-4'>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className='bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3'>
            <div className='w-9 h-9 rounded-xl bg-white/8 animate-pulse' />
            <Bar className='h-9 w-16' />
            <Bar className='h-3 w-20 bg-white/5' />
          </div>
        ))}
      </div>
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4'>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className='bg-white/5 border border-white/10 rounded-2xl p-5 h-64'>
            <Bar className='h-4 w-40 mb-4' />
            <Bar className='h-[calc(100%-2rem)] w-full bg-white/5' />
          </div>
        ))}
      </div>
    </div>
  )
}

// List/table pages: events, registrations, products, users.
export function AdminListSkeleton() {
  return (
    <div>
      <AdminHeaderSkeleton />
      <div className='flex items-center justify-between gap-3 mb-6'>
        <Bar className='h-10 w-full max-w-xs' />
        <Bar className='h-10 w-32 bg-stride-yellow-accent/20' />
      </div>
      <div className='space-y-3'>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className='flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl p-4'>
            <div className='w-11 h-11 rounded-lg bg-white/8 animate-pulse shrink-0' />
            <div className='flex-1 space-y-2'>
              <Bar className='h-4 w-1/3' />
              <Bar className='h-3 w-1/4 bg-white/5' />
            </div>
            <Bar className='h-8 w-20' />
          </div>
        ))}
      </div>
    </div>
  )
}

// Create/edit forms: events/new, events/[id]/edit, products/new, products/[id]/edit.
export function AdminFormSkeleton() {
  return (
    <div className='max-w-3xl'>
      <AdminHeaderSkeleton />
      <div className='space-y-6'>
        <div className='aspect-video max-w-md rounded-xl bg-white/5 animate-pulse' />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className='space-y-2'>
            <Bar className='h-3 w-28 bg-white/5' />
            <Bar className='h-11 w-full' />
          </div>
        ))}
        <Bar className='h-11 w-40 bg-stride-yellow-accent/20' />
      </div>
    </div>
  )
}

// Check-in page: event picker + progress counter + tag input.
export function AdminCheckInSkeleton() {
  return (
    <div className='max-w-md mx-auto'>
      <AdminHeaderSkeleton />
      <div className='space-y-4'>
        <Bar className='h-14 w-full' />
        <Bar className='h-10 w-full bg-white/5' />
        <Bar className='h-40 w-full' />
      </div>
    </div>
  )
}
