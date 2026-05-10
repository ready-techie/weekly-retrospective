const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const GITHUB_API_URL = "https://api.github.com";
const WEEKLY_LABEL = "Weekly\u{1F389}";
const MONTHLY_LABEL = "\u{1F469}\u200D\u{1F4BB}Monthly";

const FETCH_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504];

async function fetchWithRetry(url, options, retries = MAX_RETRIES) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (response.ok || !RETRYABLE_STATUS_CODES.includes(response.status)) {
      return response;
    }

    if (attempt < retries) {
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`Retrying in ${delay}ms... (attempt ${attempt + 1}/${retries})`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return fetch(url, { ...options, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
}

const MONTHLY_TEMPLATE = `# Sprint Retrospective - 4 Weeks

| **Satisfaction-level  and Value** | **Justification** |
|--:|:--:|
| Very  Happy (5)                       |                         |
| Happy  (4)                               |                         |
| Okay  (3)                                 |                         |
| Sad  (2)                                   |                         |
| Very  Sad (1)                           |                         |

## *Q1:* 🏄 What are the things that went well during the last sprint?

## *Q2:* 🤨 What are the things that could have gone better during the last sprint?

## *Q3:* 🧐 What did you learn during the last sprint on a….

## *Q4:* :calendar: What are your plans for the next sprint?`;

function validateEnv() {
  const required = ["OPENAI_API_KEY", "GITHUB_TOKEN", "GITHUB_REPO"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }

  return {
    openaiApiKey: process.env.OPENAI_API_KEY,
    githubToken: process.env.GITHUB_TOKEN,
    githubRepo: process.env.GITHUB_REPO,
  };
}

function getTargetMonth() {
  if (process.env.TARGET_MONTH) return process.env.TARGET_MONTH;

  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const year = prev.getFullYear();
  const month = String(prev.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

async function fetchWeeklyIssues({ repo, token, targetMonth }) {
  const [year, month] = targetMonth.split("-").map(Number);
  const since = new Date(year, month - 1, 1).toISOString();
  const until = new Date(year, month, 1).toISOString();

  const params = new URLSearchParams({
    labels: WEEKLY_LABEL,
    state: "closed",
    since,
    per_page: "100",
    sort: "created",
    direction: "asc",
  });

  const response = await fetchWithRetry(
    `${GITHUB_API_URL}/repos/${repo}/issues?${params}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error fetching issues (${response.status}): ${error}`);
  }

  const issues = await response.json();

  return issues.filter((issue) => {
    const created = new Date(issue.created_at);
    return created >= new Date(since) && created < new Date(until);
  });
}

function buildPrompt(issues, targetMonth) {
  const entriesText = issues
    .map((issue) => `--- ${issue.title} (${issue.created_at.slice(0, 10)}) ---\n${issue.body}`)
    .join("\n\n");

  return `아래는 ${targetMonth} 한 달간의 주간 회고 내용입니다.
이를 바탕으로 아래 월간 회고 템플릿 형식에 맞춰 내용을 채워주세요.

요구사항:
1. 한국어로 작성
2. 주간 회고들의 내용을 종합하여 한 달의 흐름과 성장을 보여줄 것
3. Satisfaction level은 주간 회고 내용의 전반적인 톤을 기반으로 판단하여, 해당하는 레벨의 Justification 칸만 채울 것
4. 각 섹션은 bullet point로 정리할 것
5. 마크다운 형식 그대로 출력할 것 (코드블록으로 감싸지 말 것)

템플릿:
${MONTHLY_TEMPLATE}

---

주간 회고 내용:

${entriesText}`;
}

async function callOpenAI(prompt, apiKey) {
  const response = await fetchWithRetry(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-5.1",
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 4096,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${error}`);
  }

  const data = await response.json();

  if (!data.choices?.length || !data.choices[0].message?.content) {
    const reason = data.error?.message || "unknown";
    throw new Error(`OpenAI returned no content. Reason: ${reason}`);
  }

  return data.choices[0].message.content;
}

async function verifyLabelExists({ repo, token, label }) {
  const encoded = encodeURIComponent(label);
  const response = await fetchWithRetry(
    `${GITHUB_API_URL}/repos/${repo}/labels/${encoded}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Label "${label}" not found in repo. Create it manually before running this script.`
    );
  }
}

async function createGitHubIssue({ title, body, repo, token }) {
  await verifyLabelExists({ repo, token, label: MONTHLY_LABEL });

  const response = await fetchWithRetry(`${GITHUB_API_URL}/repos/${repo}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({ title, body, labels: [MONTHLY_LABEL] }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error (${response.status}): ${error}`);
  }

  return response.json();
}

async function main() {
  const env = validateEnv();
  const targetMonth = getTargetMonth();

  console.log(`Target month: ${targetMonth}`);

  const issues = await fetchWeeklyIssues({
    repo: env.githubRepo,
    token: env.githubToken,
    targetMonth,
  });

  if (issues.length === 0) {
    console.log(`No weekly issues found for ${targetMonth}. Skipping.`);
    return;
  }

  console.log(`Found ${issues.length} weekly issue(s): ${issues.map((i) => i.title).join(", ")}`);

  const prompt = buildPrompt(issues, targetMonth);
  const summary = await callOpenAI(prompt, env.openaiApiKey);

  const issue = await createGitHubIssue({
    title: `📅 ${targetMonth} Monthly Retrospective`,
    body: summary,
    repo: env.githubRepo,
    token: env.githubToken,
  });

  console.log(`Issue created: ${issue.html_url}`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
