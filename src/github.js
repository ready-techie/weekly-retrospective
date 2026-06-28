const BASE = "https://api.github.com/repos/ready-techie/weekly-retrospective";

const WEEKLY_LABEL = encodeURIComponent("Weekly🎉");
const MONTHLY_LABEL = encodeURIComponent("👩‍💻Monthly");

async function apiFetch(url) {
  const cached = sessionStorage.getItem(url);
  if (cached) return JSON.parse(cached);
  const res = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  const data = await res.json();
  sessionStorage.setItem(url, JSON.stringify(data));
  return data;
}

export function fetchWeeklyIssues(page = 1) {
  return apiFetch(`${BASE}/issues?labels=${WEEKLY_LABEL}&state=all&per_page=100&sort=created&direction=desc&page=${page}`);
}

export function fetchMonthlyIssues(page = 1) {
  return apiFetch(`${BASE}/issues?labels=${MONTHLY_LABEL}&state=all&per_page=100&sort=created&direction=desc&page=${page}`);
}

export function fetchIssue(number) {
  return apiFetch(`${BASE}/issues/${number}`);
}

export function fetchComments(number) {
  return apiFetch(`${BASE}/issues/${number}/comments?per_page=100`);
}
