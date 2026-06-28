import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import dayjs from "dayjs";
import { fetchWeeklyIssues, fetchMonthlyIssues } from "./github";

const TABS = [
  { key: "weekly", label: "주간 회고", fetcher: fetchWeeklyIssues },
  { key: "monthly", label: "월간 회고", fetcher: fetchMonthlyIssues },
];

const PAGE_SIZE = 100;

const VALID_TABS = new Set(TABS.map((t) => t.key));

function IssueList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = VALID_TABS.has(searchParams.get("tab")) ? searchParams.get("tab") : "weekly";
  const [issues, setIssues] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [loadMoreError, setLoadMoreError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setLoadMoreError(null);
    setPage(1);
    const { fetcher } = TABS.find((t) => t.key === tab);
    fetcher(1)
      .then((data) => {
        setIssues(data);
        setHasMore(data.length === PAGE_SIZE);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [tab]);

  function loadMore() {
    const nextPage = page + 1;
    setLoadingMore(true);
    setLoadMoreError(null);
    const { fetcher } = TABS.find((t) => t.key === tab);
    fetcher(nextPage)
      .then((data) => {
        setIssues((prev) => [...prev, ...data]);
        setPage(nextPage);
        setHasMore(data.length === PAGE_SIZE);
      })
      .catch((e) => setLoadMoreError(e.message))
      .finally(() => setLoadingMore(false));
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Weekly Retrospective</h1>

        <div className="flex gap-2 mb-6">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSearchParams({ tab: key })}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                tab === key
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading && <p className="text-gray-500">불러오는 중...</p>}
        {error && <p className="text-red-500">오류: {error}</p>}

        {!loading && !error && issues.length === 0 && (
          <p className="text-gray-400 text-center py-12">아직 등록된 회고가 없어요.</p>
        )}

        {!loading && !error && (
          <>
            <ul className="space-y-2">
              {issues.map((issue) => (
                <li key={issue.number}>
                  <Link
                    to={`/${issue.number}`}
                    className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-indigo-400 hover:shadow-sm transition-all"
                  >
                    <span className="text-gray-800 font-medium">{issue.title}</span>
                    <span className="text-sm text-gray-400 shrink-0 ml-4">
                      {dayjs(issue.created_at).format("YYYY-MM-DD")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            {loadMoreError && (
              <p className="mt-4 text-center text-red-500">오류: {loadMoreError}</p>
            )}

            {hasMore && (
              <div className="mt-6 text-center">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-6 py-2 bg-white text-gray-600 border border-gray-300 rounded-full text-sm font-medium hover:bg-gray-100 disabled:opacity-50 transition-colors"
                >
                  {loadingMore ? "불러오는 중..." : "더 불러오기"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default IssueList;
