import { useEffect, useState } from "react";
import { BrowserRouter as Router, Route, Routes, Link } from "react-router-dom";
import dayjs from "dayjs";
import ViewPost from "./ViewPost"; // ViewPost 컴포넌트 import

function App() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const fetchPosts = async () => {
      const postFiles = import.meta.glob("/src/weekly/**/*.md");
      const postPromises = Object.keys(postFiles).map(async (filePath) => {
        const date = dayjs(
          filePath.split("/")[3].split("-").slice(0, 3).join("-")
        );
        const player = filePath.split("/")[3].split("-").slice(-1);
        return { filePath, date, player };
      });

      const posts = await Promise.all(postPromises);
      posts.sort((a, b) => b.date - a.date); // 날짜 역순으로 정렬
      setPosts(posts);
    };

    fetchPosts();
  }, []);

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <div>
              {posts.map((post, index) => (
                <div key={index}>
                  <Link to={`/${encodeURIComponent(post.filePath)}`}>
                    <p>
                      {post.date.format("YYYY-MM-DD")} {post.player}
                    </p>
                  </Link>
                </div>
              ))}
            </div>
          }
        />
        <Route path="/:filePath" element={<ViewPost />} />
      </Routes>
    </Router>
  );
}

export default App;
