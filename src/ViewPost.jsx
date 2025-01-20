import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import dayjs from "dayjs";

function ViewPost(file) {
  const [post, setPost] = useState([]);

  useEffect(() => {
    const loadPosts = async () => {
      const content = await Promise(async () => {
        const response = await fetch(file);
        const content = await response.text();
        const date = dayjs(file.split("/")[2].split("-").slice(0, 3).join("-")); // 파일명에서 날짜 추출
        console.log(file.split("/")[2]);
        return { date, content };
      });
      setPost(content);
    };

    loadPosts();
  }, []);

  return (
    <div>
      <h1>My Blog</h1>
      <div>
        <h2>{post.date.format("YYYY-MM-DD")}</h2>
        <ReactMarkdown>{post.content}</ReactMarkdown>
      </div>
    </div>
  );
}

export default ViewPost;
