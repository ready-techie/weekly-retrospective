import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import dayjs from "dayjs";
import { fetchIssue, fetchComments } from "./github";

function IssueDetail() {
  const { number } = useParams();
  const [issue, setIssue] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([fetchIssue(number), fetchComments(number)])
      .then(([issueData, commentsData]) => {
        setIssue(issueData);
        setComments(commentsData);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [number]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-red-500">오류: {error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <Link to="/" className="text-indigo-600 hover:underline text-sm mb-6 inline-block">
          ← 목록으로
        </Link>

        <h1 className="text-2xl font-bold text-gray-800 mb-1">{issue.title}</h1>
        <p className="text-sm text-gray-400 mb-8">
          {dayjs(issue.created_at).format("YYYY-MM-DD")}
        </p>

        {comments.length === 0 && (
          <p className="text-gray-400 text-center py-12">아직 작성된 회고가 없어요.</p>
        )}

        <div className="space-y-6">
          {comments.map((comment) => (
            <div key={comment.id} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <img
                  src={comment.user.avatar_url}
                  alt={comment.user.login}
                  className="w-8 h-8 rounded-full"
                />
                <span className="font-medium text-gray-700">{comment.user.login}</span>
              </div>
              <div className="prose prose-sm max-w-none text-gray-700">
                <ReactMarkdown>{comment.body}</ReactMarkdown>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default IssueDetail;
