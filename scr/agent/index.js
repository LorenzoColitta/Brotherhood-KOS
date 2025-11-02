// Online-only agent that runs in GitHub Actions.
// It finds open issues labeled "agent", posts a comment, and labels them "agent-processed".
// This script expects the runner to supply GITHUB_TOKEN (the Actions-provided token).
// It uses node-fetch v2 (declared in package.json);

const fetch = require('node-fetch');

const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error('GITHUB_TOKEN not found in environment; exiting.');
  process.exit(1);
}

const repo = process.env.GITHUB_REPOSITORY;
if (!repo) {
  console.error('GITHUB_REPOSITORY not set; exiting.');
  process.exit(1);
}

const [owner, repoName] = repo.split('/');
const headers = {
  Authorization: `token ${token}`,
  Accept: 'application/vnd.github+json',
  'User-Agent': 'brotherhood-kos-agent'
};

async function fetchIssues() {
  const url = `https://api.github.com/repos/${owner}/${repoName}/issues?labels=agent&state=open`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`Failed to list issues: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function postComment(issue_number, body) {
  const url = `https://api.github.com/repos/${owner}/${repoName}/issues/${issue_number}/comments`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ body })
  });
  if (!res.ok) {
    throw new Error(`Failed to post comment: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function addLabel(issue_number, labels) {
  const url = `https://api.github.com/repos/${owner}/${repoName}/issues/${issue_number}/labels`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ labels })
  });
  if (!res.ok) {
    throw new Error(`Failed to add labels: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

(async () => {
  try {
    const issues = await fetchIssues();
    if (!Array.isArray(issues) || issues.length === 0) {
      console.log('No open issues with label "agent".');
      return;
    }
    for (const issue of issues) {
      const number = issue.number;
      console.log(`Processing issue #${number}: ${issue.title}`);
      const labels = (issue.labels || []).map(l => (typeof l === 'string' ? l : l.name));
      if (labels.includes('agent-processed')) {
        console.log(`Issue #${number} already processed; skipping.`);
        continue;
      }
      const comment = `Hello — I am the repository agent running in GitHub Actions. I can run automated checks or post updates. This is an automated message. To opt-out, remove the "agent" label.`;
      await postComment(number, comment);
      await addLabel(number, ['agent-processed']);
      console.log(`Commented and labeled issue #${number}.`);
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
