import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useParams } from "react-router-dom";
import dayjs from "dayjs";

function ViewPost() {
  const { filePath } = useParams(); // URL에서 filePath 파라미터를 가져옴
  const [post, setPost] = useState(null);

  useEffect(() => {
    const loadPost = async () => {
      const response = await fetch(filePath);
      const content = await response.text();
      const date = dayjs(
        filePath.split("/")[3].split("-").slice(0, 3).join("-")
      );
      const player = filePath
        .split("/")[3]
        .split("-")
        .slice(-1)[0]
        .replace(".md", "");
      setPost({ date, content, player });
    };

    loadPost();
  }, [filePath]);

  if (!post) {
    return <p>Loading...</p>;
  }

  return (
    <div>
      <h2>
        {post.date.format("YYYY-MM-DD")} by {post.player}
      </h2>
      <ReactMarkdown>{post.content}</ReactMarkdown>
    </div>
  );
}

export default ViewPost;
