import { redirect } from 'next/navigation'

// Register and login are the same flow (Google OAuth). Redirect permanently.
export default function RegisterPage() {
  redirect('/login')
}
