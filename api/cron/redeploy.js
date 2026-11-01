// Vercel Cron Job target (see vercel.json's "crons" entry) - fires twice a
// year, on Oct 1 and Jan 1, so the Christmas/default app icon (picked at
// build time in vite.config.ts) flips on schedule even if no other code
// change happens to ship around those dates. Just forwards to a Deploy
// Hook, so it needs no Vercel API token - only the hook URL, kept in an
// env var since anyone holding it can trigger a deploy.
export default async function handler(req, res) {
  const authHeader = req.headers.authorization
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    res.status(401).send('Unauthorized')
    return
  }

  const hookUrl = process.env.DEPLOY_HOOK_URL
  if (!hookUrl) {
    res.status(500).send('DEPLOY_HOOK_URL is not configured')
    return
  }

  const hookRes = await fetch(hookUrl, { method: 'POST' })
  res.status(hookRes.ok ? 200 : 502).send(hookRes.ok ? 'Redeploy triggered' : `Deploy hook failed: ${hookRes.status}`)
}
