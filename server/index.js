require('dotenv').config()
const express = require('express')
const axios = require('axios')
const cookieParser = require('cookie-parser')
const cors = require('cors')

const app = express()
app.use(express.json())
app.use(cookieParser())

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173/open-source-dashboard/'
const CLIENT_ID = process.env.GITHUB_CLIENT_ID
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET

app.use(cors({ origin: FRONTEND_URL, credentials: true }))

app.get('/auth/github', (req, res) => {
  const redirectUri = `${req.protocol}://${req.get('host')}/auth/github/callback`
  const url = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo%20user`
  res.redirect(url)
})

app.get('/auth/github/callback', async (req, res) => {
  const code = req.query.code
  if (!code) return res.status(400).send('Missing code')

  try {
    const tokenRes = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code
      },
      {
        headers: { Accept: 'application/json' }
      }
    )

    const accessToken = tokenRes.data.access_token
    if (!accessToken) return res.status(400).send('No access token received')

    // Set an httpOnly cookie so client JS cannot read it directly
    res.cookie('gh_token', accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 // 1 day
    })

    // Redirect back to the frontend app
    res.redirect(FRONTEND_URL)
  } catch (err) {
    console.error('OAuth callback error', err?.response?.data || err.message || err)
    res.status(500).send('OAuth exchange failed')
  }
})

// Proxy endpoint: forward requests to GitHub API using token from cookie
app.use('/api/github', async (req, res) => {
  const token = req.cookies['gh_token']
  if (!token) return res.status(401).json({ error: 'Not authenticated' })

  const githubPath = req.path
  const url = `https://api.github.com${githubPath}`

  try {
    const method = req.method.toLowerCase()
    const resp = await axios({
      method,
      url,
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json'
      },
      params: req.query,
      data: req.body
    })
    res.status(resp.status).set(resp.headers).send(resp.data)
  } catch (err) {
    const status = err?.response?.status || 500
    const data = err?.response?.data || { error: 'GitHub proxy error' }
    res.status(status).send(data)
  }
})

const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
  console.log(`OAuth proxy listening on http://localhost:${PORT}`)
})
