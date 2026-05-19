import { readFileSync } from "fs";

const GITHUB_API_URL = "https://api.github.com";
const WEEKLY_LABEL = "Weekly\u{1F389}";
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const TEMPLATE_PATH = ".github/ISSUE_TEMPLATE/retrospective_weekly.md";

const FETCH_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504];

async function fetchWithRetry(url, options, retries = MAX_RETRIES) {
  let lastResponse;
  for (let attempt = 0; attempt <= retries; attempt++) {
    lastResponse = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (lastResponse.ok || !RETRYABLE_STATUS_CODES.includes(lastResponse.status)) {
      return lastResponse;
    }

    if (attempt < retries) {
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`Retrying in ${delay}ms... (retry ${attempt + 1}/${retries})`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  return lastResponse;
}

function truncateErrorBody(text) {
  return text.length > 200 ? `${text.slice(0, 200)}... (truncated)` : text;
}

function getKSTDateString() {
  const kst = new Date(Date.now() + KST_OFFSET_MS);
  return kst.toISOString().slice(0, 10);
}

function subtractDays(dateStr, days) {
  const date = new Date(dateStr + "T00:00:00Z");
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function getWeekRange() {
  if (process.env.TARGET_DATE) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(process.env.TARGET_DATE)) {
      throw new Error(
        `Invalid TARGET_DATE format: "${process.env.TARGET_DATE}". Expected YYYY-MM-DD (e.g. 2026-05-18).`
      );
    }
    return { start: subtractDays(process.env.TARGET_DATE, 6), end: process.env.TARGET_DATE };
  }

  const end = getKSTDateString();
  return { start: subtractDays(end, 6), end };
}

function getTemplateBody() {
  try {
    const content = readFileSync(TEMPLATE_PATH, "utf8");
    const parts = content.split(/^---$/m);
    // parts[0] = "", parts[1] = frontmatter, parts[2+] = body
    return parts.length >= 3 ? parts.slice(2).join("---").trim() : "";
  } catch {
    return "";
  }
}

function validateEnv() {
  const required = ["GITHUB_TOKEN", "GITHUB_REPO"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }

  return {
    githubToken: process.env.GITHUB_TOKEN,
    githubRepo: process.env.GITHUB_REPO,
    assignees: process.env.ASSIGNEES
      ? process.env.ASSIGNEES.split(",").map((s) => s.trim()).filter(Boolean)
      : [],
  };
}

async function createGitHubIssue({ title, body, assignees, repo, token }) {
  const response = await fetchWithRetry(`${GITHUB_API_URL}/repos/${repo}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({ title, body, labels: [WEEKLY_LABEL], assignees }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error creating issue (${response.status}): ${truncateErrorBody(error)}`);
  }

  return response.json();
}

async function main() {
  const env = validateEnv();
  const { start, end } = getWeekRange();
  const templateBody = getTemplateBody();

  console.log(`Creating weekly issue for ${start} ~ ${end}`);

  const issue = await createGitHubIssue({
    title: `📝 Weekly Retrospective - ${start} ~ ${end}`,
    body: templateBody,
    assignees: env.assignees,
    repo: env.githubRepo,
    token: env.githubToken,
  });

  console.log(`Issue created: ${issue.html_url}`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
