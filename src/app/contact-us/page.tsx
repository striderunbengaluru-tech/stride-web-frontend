import type { Metadata } from 'next'
import { ContactContent } from '@/components/contact/contact-content'

export const metadata: Metadata = {
  title: 'Contact Us — Stride Run Club',
  description: 'Get in touch with Stride Run Club Bengaluru.',
}

export default function ContactUsPage() {
  return (
    <main className='bg-stride-purple-primary'>
      <ContactContent />
    </main>
  )
}
