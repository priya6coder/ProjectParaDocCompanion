// scripts/auto-doc-sync.js
const fs = require('fs');
const { execSync } = require('child_process');

// Helper function to pause execution for a few seconds
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url, options, maxRetries = 3, delayMs = 2000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // If we hit a temporary server error (like 503 or 429 rate limit), retry
      if (
        (response.status === 503 || response.status === 429) &&
        attempt < maxRetries
      ) {
        console.warn(
          `⚠️ Gemini API returned status ${
            response.status
          }. Attempt ${attempt} of ${maxRetries}. Retrying in ${
            delayMs / 1000
          }s...`,
        );
        await delay(delayMs);
        continue;
      }

      return response;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      console.warn(`⚠️ Network error on attempt ${attempt}. Retrying...`);
      await delay(delayMs);
    }
  }
}

async function runCloudSync() {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const REPO_REPOSITORY = process.env.GITHUB_REPOSITORY;
  const COMMIT_SHA = process.env.GITHUB_SHA;

  if (!GEMINI_API_KEY || !GITHUB_TOKEN) {
    console.error('Missing required environment authorization keys.');
    process.exit(1);
  }

  const [owner, repo] = REPO_REPOSITORY.split('/');
  console.log(
    `🚀 Starting automated drift analysis for ${owner}/${repo} at commit ${COMMIT_SHA}`,
  );

  try {
    const commitMessage = execSync('git log -1 --pretty=%B').toString().trim();
    const codeDiff = execSync(`git diff HEAD~1 HEAD`).toString().trim();

    if (!codeDiff) {
      console.log(
        'No code execution changes detected in this push. Skipping analysis.',
      );
      return;
    }

    const readmePath = './README.md';
    if (!fs.existsSync(readmePath)) {
      console.error('README.md does not exist in project root.');
      process.exit(1);
    }
    const currentReadme = fs.readFileSync(readmePath, 'utf8');

    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const prompt = `
      You are an automated software architect auditing codebases for "Documentation Rot".
      Analyze the recent code changes (Diff) and the developer's intent (Commit Message) against the existing project documentation (README.md).
      
      CRITICAL: Return your response strictly as a single JSON object. Do not wrap it in markdown code blocks like \`\`\`json. Match this exact schema structure:
      {
        "hasDiscrepancy": true or false,
        "severity": "None" | "Low" | "Medium" | "High",
        "explanation": "Concise reason why the manual is out of sync.",
        "updatedDocumentation": "The fully revised and updated text version of the README.md reflecting these changes."
      }

      --- METRICS ---
      COMMIT INTENT MESSAGE: ${commitMessage}
      EXTRACTED CODE DIFF: ${codeDiff}
      EXISTING README.md: ${currentReadme}
    `;

    // Execute network payload using our new robust retry wrapper
    const response = await fetchWithRetry(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      }),
    });

    if (!response.ok)
      throw new Error(
        `Gemini connection dropped with terminal status: ${response.status}`,
      );

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    const report = JSON.parse(rawText.trim());
    console.log(
      `Analysis complete. Severity Level: ${report.severity}. Discrepancy Found: ${report.hasDiscrepancy}`,
    );

    if (report.hasDiscrepancy) {
      fs.writeFileSync(readmePath, report.updatedDocumentation, 'utf8');
      console.log(
        '📝 README.md updated locally inside cloud runner. Ready to push updates.',
      );

      execSync('git config --global user.name "DocRot Automation Bot"');
      execSync(
        'git config --global user.email "docrot-bot@users.noreply.github.com"',
      );
      execSync('git add README.md');
      execSync(
        'git commit -m "docs: auto-remedial sync to resolve documentation rot [skip ci]"',
      );
      execSync('git push');
      console.log(
        '🎉 Successfully updated the remote Source of Truth on GitHub!',
      );
    } else {
      console.log(
        '✅ Documentation is perfectly aligned with your changes. No actions required.',
      );
    }
  } catch (error) {
    console.error('Execution failed during cloud runtime tracking:', error);
    process.exit(1);
  }
}

runCloudSync();
