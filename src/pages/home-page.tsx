import { useAuth } from '@/auth/auth-provider'

export function HomePage() {
  const { user } = useAuth()
  const name = (user?.user_metadata?.display_name as string | undefined) ?? user?.email

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">Welcome{name ? `, ${name}` : ''}.</h1>
      <p className="text-muted-foreground">
        This is the Home tab. Upcoming occasions and gift reminders will live here in a later phase.
      </p>
    </div>
  )
}
