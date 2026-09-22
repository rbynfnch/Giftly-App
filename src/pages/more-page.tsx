import { ThemeSwitcher } from '@/components/theme-switcher'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/auth/auth-provider'
import { supabase } from '@/lib/supabase'

export function MorePage() {
  const { user } = useAuth()

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">More</h1>
      <ThemeSwitcher />
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <p className="text-sm font-medium">Signed in as</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
        <Button variant="outline" onClick={() => void supabase.auth.signOut()}>
          Sign out
        </Button>
      </div>
    </div>
  )
}
