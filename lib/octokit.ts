import { Octokit } from "octokit";

/**
 * Get the GitHub client
 * @returns The GitHub client
 */
function getGitHubClient(): Octokit {
  const org = process.env.GITHUB_ORG;
  const token = process.env.GITHUB_TOKEN;

  if (!org) {
    throw Error(
      "'GITHUB_ORG' environment needs to be set with a GitHub Organization (e.g.: 'ohcnetwork')."
    );
  }

  if (!token) {
    throw Error(
      "'GITHUB_TOKEN' environment needs to be set with a GitHub Access Token."
    );
  }

  return new Octokit({ auth: token });
}

export const octokit = getGitHubClient();
