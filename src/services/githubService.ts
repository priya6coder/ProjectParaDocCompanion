import { GITHUB_TOKEN } from '@env';
import { decode } from 'base-64'; // Fixes the atob error safely

const BASE_URL = 'https://api.github.com';

export interface CommitData {
  message: string;
  diff: string;
}

// Helper to handle standard headers
const getHeaders = (acceptType = 'application/vnd.github.v3+json') => {
  return {
    Authorization: `token ${GITHUB_TOKEN}`,
    Accept: acceptType,
  };
};

/**
 * Fetches the commit message and raw diff for a specific commit SHA.
 */
export const fetchCommitDiff = async (
  owner: string,
  repo: string,
  commitSha: string,
): Promise<CommitData> => {
  try {
    // 1. Fetch the raw diff text
    const diffResponse = await fetch(
      `${BASE_URL}/repos/${owner}/${repo}/commits/${commitSha}`,
      {
        method: 'GET',
        headers: getHeaders('application/vnd.github.v3.diff'),
      },
    );

    if (!diffResponse.ok) {
      throw new Error(`Diff fetch failed with status ${diffResponse.status}`);
    }
    const diffText = await diffResponse.text();

    // 2. Fetch the commit metadata to extract the commit message description
    const metaResponse = await fetch(
      `${BASE_URL}/repos/${owner}/${repo}/commits/${commitSha}`,
      {
        method: 'GET',
        headers: getHeaders(),
      },
    );

    if (!metaResponse.ok) {
      throw new Error(
        `Metadata fetch failed with status ${metaResponse.status}`,
      );
    }
    const metaData = await metaResponse.json();
    const message = metaData.commit?.message || 'No commit message available';

    return { message, diff: diffText };
  } catch (error) {
    console.error('Error fetching commit diff:', error);
    throw error;
  }
};

/**
 * Fetches and decodes the current repository README.md file.
 */
export const fetchCurrentReadme = async (
  owner: string,
  repo: string,
): Promise<string> => {
  try {
    const response = await fetch(
      `${BASE_URL}/repos/${owner}/${repo}/contents/README.md`,
      {
        method: 'GET',
        headers: getHeaders(),
      },
    );

    if (!response.ok) {
      throw new Error(
        `README fetch failed with status ${response.status}. Make sure README.md exists.`,
      );
    }

    const data = await response.json();

    // Clean up incoming base64 formatting newlines and decode safely using the base-64 library
    const cleanedBase64 = data.content.replace(/\s/g, '');
    const decodedReadme = decode(cleanedBase64);

    return decodedReadme;
  } catch (error) {
    console.error('Error fetching README:', error);
    throw error;
  }
};
