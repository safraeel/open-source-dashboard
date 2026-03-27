export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const pathname = url.pathname

    const FRONTEND_URL = env.FRONTEND_URL || 'https://safraeel.github.io/open-source-dashboard/'
    const CLIENT_ID = env.GITHUB_CLIENT_ID || ''
    const CLIENT_SECRET = env.GITHUB_CLIENT_SECRET || ''

    const jsonResponse = (obj, status = 200) =>
      new Response(JSON.stringify(obj), {
        status,
        headers: { 'Content-Type': 'application/json;charset=utf-8' }
      })

    // Simple cookie parser
    const getCookie = (req, name) => {
      const cookie = req.headers.get('Cookie') || ''
      const parts = cookie.split(';').map(c => c.trim())
      for (const p of parts) {
        const [k, ...v] = p.split('=')
        if (k === name) return decodeURIComponent(v.join('='))
      }
      return null
    }

    if (pathname === '/auth/github') {
      const redirectUri = `${url.origin}/auth/github/callback`
      const oauthUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&scope=repo%20user`
      return Response.redirect(oauthUrl, 302)
    }

    if (pathname === '/auth/github/callback') {
      const code = url.searchParams.get('code')
      if (!code) return jsonResponse({ error: 'Missing code' }, 400)

      try {
        const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code })
        })
        const tokenData = await tokenRes.json()
        const accessToken = tokenData.access_token
        if (!accessToken) return jsonResponse({ error: 'No access token received' }, 400)

        const maxAge = 60 * 60 * 24 // 1 day
        const cookie = `gh_token=${encodeURIComponent(accessToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}; Secure`

        return new Response('', {
          status: 302,
          headers: {
            Location: FRONTEND_URL,
            'Set-Cookie': cookie
          }
        })
      } catch (err) {
        return jsonResponse({ error: 'OAuth exchange failed' }, 500)
      }
    }

    if (pathname.startsWith('/api/github')) {
      const token = getCookie(request, 'gh_token')
      if (!token) return jsonResponse({ error: 'Not authenticated' }, 401)

      const githubPath = pathname.replace('/api/github', '') || '/'
      const target = `https://api.github.com${githubPath}${url.search}`

      const headers = new Headers(request.headers)
      headers.set('Authorization', `token ${token}`)
      headers.set('Accept', 'application/vnd.github.v3+json')
      headers.delete('Cookie')

      const init = {
        method: request.method,
        headers,
        redirect: 'manual'
      }
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        init.body = await request.arrayBuffer()
      }

      try {
        const resp = await fetch(target, init)
        const respHeaders = new Headers(resp.headers)
        respHeaders.delete('transfer-encoding')
        const body = await resp.arrayBuffer()
        return new Response(body, { status: resp.status, headers: respHeaders })
      } catch (err) {
        return jsonResponse({ error: 'GitHub proxy error' }, 502)
      }
    }

    return jsonResponse({ error: 'Not found' }, 404)
  }
}
