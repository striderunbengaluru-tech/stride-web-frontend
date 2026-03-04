import Link from 'next/link'

const navLinks = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/events', label: 'Events' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/scan', label: 'Scan QR' },
]

export function AdminNav() {
  return (
    <nav className='bg-white/10 backdrop-blur-md border-b border-white/15 px-6 py-3'>
      <div className='max-w-6xl mx-auto flex items-center gap-1 flex-wrap'>
        <span className='text-stride-yellow-accent font-bold text-sm mr-4 uppercase tracking-widest'>
          Admin
        </span>
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className='text-white/70 hover:text-white text-sm px-3 py-1.5 rounded-md hover:bg-white/10 transition-colors'
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
