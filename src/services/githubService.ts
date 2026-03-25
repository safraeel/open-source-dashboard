import axios from 'axios'
import { 
  GitHubUser, 
  GitHubRepo, 
  GitHubIssue, 
  GitHubCommit, 
  GitHubLabel,
  IssueSearchFilters 
} from '../types/github'

// When a user provides a PAT the client will call the GitHub API directly.
// If no PAT is provided we proxy requests through the local OAuth server
// at `/api/github` which uses an httpOnly cookie-set token.

const GITHUB_API = 'https://api.github.com'
// When running locally the OAuth proxy listens on port 4000.
// Use the full proxy URL so requests reach the proxy instead of the Vite dev server.
const PROXY_PREFIX = 'http://localhost:4000/api/github'

class GitHubService {
  private token: string | null = null

  setToken(token: string) {
    this.token = token
    localStorage.setItem('github_token', token)
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('github_token')
    }
    return this.token
  }

  private getHeaders() {
    const token = this.getToken()
    return {
      headers: {
        'Authorization': token ? `token ${token}` : undefined,
        'Accept': 'application/vnd.github.v3+json'
      }
    }
  }

  // Choose base URL depending on whether a client-side token exists
  private getApiBase() {
    return this.getToken() ? GITHUB_API : PROXY_PREFIX
  }

  async getCurrentUser(): Promise<GitHubUser> {
    const response = await axios.get(`${this.getApiBase()}/user`, this.getHeaders())
    return response.data
  }

  async getUser(username: string): Promise<GitHubUser> {
    const response = await axios.get(`${this.getApiBase()}/users/${username}`, this.getHeaders())
    return response.data
  }

  async getUserRepos(username: string, page: number = 1): Promise<GitHubRepo[]> {
    const response = await axios.get(`${this.getApiBase()}/users/${username}/repos`, {
      ...this.getHeaders(),
      params: {
        page,
        per_page: 100,
        sort: 'updated',
        direction: 'desc'
      }
    })
    return response.data
  }

  async getUserCommits(username: string, repo: string, since?: string): Promise<GitHubCommit[]> {
    const params: any = { per_page: 100 }
    if (since) {
      params.since = since
    }

    const response = await axios.get(`${this.getApiBase()}/repos/${username}/${repo}/commits`, {
      ...this.getHeaders(),
      params
    })
    return response.data
  }

  async searchIssues(filters: IssueSearchFilters & { query: string }): Promise<GitHubIssue[]> {
    const params: any = {
      q: filters.query,
      per_page: filters.per_page || 30,
      page: filters.page || 1
    }

    if (filters.sort) {
      params.sort = filters.sort
    }
    if (filters.order) {
      params.order = filters.order
    }

    const response = await axios.get(`${this.getApiBase()}/search/issues`, {
      ...this.getHeaders(),
      params
    })
    return response.data.items
  }

  async getRepoIssues(owner: string, repo: string, state: 'open' | 'closed' = 'open'): Promise<GitHubIssue[]> {
    const response = await axios.get(`${this.getApiBase()}/repos/${owner}/${repo}/issues`, {
      ...this.getHeaders(),
      params: {
        state,
        per_page: 100
      }
    })
    return response.data
  }

  async getRepoLabels(owner: string, repo: string): Promise<GitHubLabel[]> {
    const response = await axios.get(`${this.getApiBase()}/repos/${owner}/${repo}/labels`, this.getHeaders())
    return response.data
  }

  async getContributorsStats(owner: string, repo: string): Promise<any[]> {
    const response = await axios.get(`${this.getApiBase()}/repos/${owner}/${repo}/stats/contributors`, this.getHeaders())
    return response.data
  }

  async getRepository(owner: string, repo: string): Promise<GitHubRepo> {
    const response = await axios.get(`${this.getApiBase()}/repos/${owner}/${repo}`, this.getHeaders())
    return response.data
  }

  async getLanguages(owner: string, repo: string): Promise<Record<string, number>> {
    const response = await axios.get(`${this.getApiBase()}/repos/${owner}/${repo}/languages`, this.getHeaders())
    return response.data
  }

  // Helper methods for common searches
  async findGoodFirstIssues(language?: string): Promise<GitHubIssue[]> {
    let query = 'label:"good first issue" state:open'
    if (language) {
      query += ` language:${language}`
    }
    
    return this.searchIssues({
      query,
      sort: 'created',
      order: 'desc',
      per_page: 50
    })
  }

  async findBeginnerIssues(language?: string): Promise<GitHubIssue[]> {
    let query = 'label:"beginner" state:open'
    if (language) {
      query += ` language:${language}`
    }
    
    return this.searchIssues({
      query,
      sort: 'created',
      order: 'desc',
      per_page: 50
    })
  }

  async findHelpWantedIssues(language?: string): Promise<GitHubIssue[]> {
    let query = 'label:"help wanted" state:open'
    if (language) {
      query += ` language:${language}`
    }
    
    return this.searchIssues({
      query,
      sort: 'created',
      order: 'desc',
      per_page: 50
    })
  }
}

export const githubService = new GitHubService()