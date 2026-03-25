import React, { useState } from 'react'
import { githubService } from '../services/githubService'

interface TokenInputProps {
  onTokenSet: () => void
}

const TokenInput: React.FC<TokenInputProps> = ({ onTokenSet }) => {
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token.trim()) {
      setError('Please enter a GitHub token')
      return
    }

    setLoading(true)
    setError('')

    try {
      githubService.setToken(token.trim())
      // Test the token by making a simple API call
      await githubService.getCurrentUser()
      onTokenSet()
    } catch (err) {
      setError('Invalid token. Please check your GitHub Personal Access Token.')
      githubService.setToken('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 max-w-md mx-auto">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">GitHub Authentication</h2>
      <p className="text-gray-600 text-sm mb-4">
        To access your GitHub data, please enter your GitHub Personal Access Token.
        This token will be stored locally in your browser.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-2">
            GitHub Personal Access Token
          </label>
          <input
            type="password"
            id="token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div className="flex space-x-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Validating...' : 'Set Token'}
          </button>
        </div>
      </form>

      <div className="mt-4 flex justify-center">
        <a
          href="http://localhost:4000/auth/github"
          className="flex-1 text-center bg-gray-800 text-white py-2 px-4 rounded-md hover:bg-gray-900"
        >
          Sign in with GitHub
        </a>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <p className="mb-2">To create a token:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Go to GitHub Settings → Developer settings → Personal access tokens</li>
          <li>Click "Generate new token (classic)"</li>
          <li>Give it a name and select scopes: repo, user</li>
          <li>Copy the generated token and paste it above</li>
        </ol>
      </div>
    </div>
  )
}

export default TokenInput