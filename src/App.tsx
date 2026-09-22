import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AppShell } from '@/app-shell/app-shell'
import { AuthProvider, useAuth } from '@/auth/auth-provider'
import { SignInPage } from '@/auth/sign-in-page'
import { HomePage } from '@/pages/home-page'
import { MorePage } from '@/pages/more-page'
import { PeoplePage } from '@/pages/people-page'
import { PersonProfilePage } from '@/pages/person-profile-page'
import { PlaceholderPage } from '@/pages/placeholder-page'
import { ThemeProvider } from '@/theme/theme-provider'

function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) {
    return <div className="flex min-h-svh items-center justify-center text-muted-foreground">Loading…</div>
  }

  if (!session) {
    return <Navigate to="/sign-in" replace />
  }

  return <>{children}</>
}

function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) {
    return <div className="flex min-h-svh items-center justify-center text-muted-foreground">Loading…</div>
  }

  if (session) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route
              path="/sign-in"
              element={
                <RedirectIfAuthed>
                  <SignInPage />
                </RedirectIfAuthed>
              }
            />
            <Route
              element={
                <RequireAuth>
                  <AppShell />
                </RequireAuth>
              }
            >
              <Route index element={<HomePage />} />
              <Route path="people" element={<PeoplePage />} />
              <Route path="people/:id" element={<PersonProfilePage />} />
              <Route
                path="gifts"
                element={<PlaceholderPage title="Gifts" note="Gift tracking is coming in a later phase." />}
              />
              <Route
                path="shop"
                element={<PlaceholderPage title="Shop" note="Shopping integrations are coming in a later phase." />}
              />
              <Route path="more" element={<MorePage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
