import axios from 'axios';

export interface GitHubContributions {
  totalCommits: number;
  totalPRs: number;
  totalIssues: number;
  totalReviews: number;
  contributionCalendar: {
    totalContributions: number;
    weeks: Array<{
      contributionDays: Array<{
        contributionCount: number;
        date: string;
      }>;
    }>;
  };
}

export class GitHubService {
  private readonly apiBase = 'https://api.github.com';

  /**
   * Enrich basic profile with additional GitHub data
   */
  async enrichProfile(basicProfile: any, accessToken: string): Promise<any> {
    const enrichedProfile = { ...basicProfile };

    try {
      // Fetch user emails if not included
      if (!enrichedProfile.email) {
        const emails = await this.fetchUserEmails(accessToken);
        const primaryEmail = emails.find((e: any) => e.primary);
        if (primaryEmail) {
          enrichedProfile.email = primaryEmail.email;
          enrichedProfile.email_verified = primaryEmail.verified;
        }
      }

      // Fetch contribution data
      const contributions = await this.fetchContributions(
        enrichedProfile.login,
        accessToken
      );
      enrichedProfile.contributions = contributions;

      // Fetch repository statistics
      const repoStats = await this.fetchRepositoryStats(
        enrichedProfile.login,
        accessToken
      );
      enrichedProfile.repository_stats = repoStats;

      // Check if user is verified (has verified domain or organization)
      enrichedProfile.verified = await this.checkVerificationStatus(
        enrichedProfile.login,
        accessToken
      );

      return enrichedProfile;
    } catch (error) {
      console.error('Error enriching GitHub profile:', error);
      // Return basic profile if enrichment fails
      return enrichedProfile;
    }
  }

  /**
   * Fetch user emails
   */
  private async fetchUserEmails(accessToken: string): Promise<any[]> {
    try {
      const response = await axios.get(`${this.apiBase}/user/emails`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch user emails:', error);
      return [];
    }
  }

  /**
   * Fetch contribution statistics using GraphQL API
   */
  private async fetchContributions(
    username: string,
    accessToken: string
  ): Promise<GitHubContributions> {
    try {
      const query = `
        query($username: String!) {
          user(login: $username) {
            contributionsCollection {
              totalCommitContributions
              totalIssueContributions
              totalPullRequestContributions
              totalPullRequestReviewContributions
              contributionCalendar {
                totalContributions
                weeks {
                  contributionDays {
                    contributionCount
                    date
                  }
                }
              }
            }
          }
        }
      `;

      const response = await axios.post(
        'https://api.github.com/graphql',
        {
          query,
          variables: { username }
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      const contributions = response.data.data.user.contributionsCollection;
      
      return {
        totalCommits: contributions.totalCommitContributions,
        totalPRs: contributions.totalPullRequestContributions,
        totalIssues: contributions.totalIssueContributions,
        totalReviews: contributions.totalPullRequestReviewContributions,
        contributionCalendar: contributions.contributionCalendar
      };
    } catch (error) {
      console.error('Failed to fetch contributions:', error);
      return {
        totalCommits: 0,
        totalPRs: 0,
        totalIssues: 0,
        totalReviews: 0,
        contributionCalendar: {
          totalContributions: 0,
          weeks: []
        }
      };
    }
  }

  /**
   * Fetch repository statistics
   */
  private async fetchRepositoryStats(
    username: string,
    accessToken: string
  ): Promise<any> {
    try {
      const response = await axios.get(
        `${this.apiBase}/users/${username}/repos`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.github.v3+json'
          },
          params: {
            type: 'owner',
            sort: 'updated',
            per_page: 100
          }
        }
      );

      const repos = response.data;
      
      return {
        totalRepositories: repos.length,
        totalStars: repos.reduce((sum: number, repo: any) => sum + repo.stargazers_count, 0),
        totalForks: repos.reduce((sum: number, repo: any) => sum + repo.forks_count, 0),
        languages: [...new Set(repos.map((repo: any) => repo.language).filter(Boolean))],
        topRepositories: repos
          .sort((a: any, b: any) => b.stargazers_count - a.stargazers_count)
          .slice(0, 5)
          .map((repo: any) => ({
            name: repo.name,
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            language: repo.language,
            description: repo.description
          }))
      };
    } catch (error) {
      console.error('Failed to fetch repository stats:', error);
      return {
        totalRepositories: 0,
        totalStars: 0,
        totalForks: 0,
        languages: [],
        topRepositories: []
      };
    }
  }

  /**
   * Check if user has verified status (GitHub Sponsors, verified org member, etc.)
   */
  private async checkVerificationStatus(
    username: string,
    accessToken: string
  ): Promise<boolean> {
    try {
      // Check if user is a GitHub Sponsor
      const sponsorResponse = await axios.get(
        `${this.apiBase}/users/${username}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      // Check various verification indicators
      const userdata = sponsorResponse.data;
      
      return !!(
        userdata.is_sponsor ||
        userdata.has_sponsor_listing ||
        userdata.company?.startsWith('@') || // Verified organization member
        userdata.twitter_username // Has linked Twitter account
      );
    } catch (error) {
      console.error('Failed to check verification status:', error);
      return false;
    }
  }

  /**
   * Validate GitHub username format
   */
  static validateUsername(username: string): boolean {
    // GitHub username rules:
    // - May only contain alphanumeric characters or hyphens
    // - Cannot have multiple consecutive hyphens
    // - Cannot begin or end with a hyphen
    // - Maximum 39 characters
    const usernameRegex = /^[a-zA-Z\d](?:[a-zA-Z\d]|-(?=[a-zA-Z\d])){0,38}$/;
    return usernameRegex.test(username);
  }

  /**
   * Generate GitHub profile URL
   */
  static getProfileUrl(username: string): string {
    return `https://github.com/${username}`;
  }
}