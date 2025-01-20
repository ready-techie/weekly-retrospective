import { useEffect, useState } from "react";
import dayjs from "dayjs";

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
        console.log(player);
        return { filePath, date, player };
      });

      const posts = await Promise.all(postPromises);
      posts.sort((a, b) => b.date - a.date); // 날짜 역순으로 정렬
      setPosts(posts);
    };

    fetchPosts();
  }, []);

  const handlePostClick = (filePath) => {
    //Todo
  };

  return (
    <div>
      <h1>🦄RT Retro</h1>
      {posts.map((post, index) => (
        <div key={index} onClick={() => handlePostClick(post.filePath)}>
          <p>
            {post.date.format("YYYY-MM-DD")} {post.player}
          </p>
        </div>
      ))}
    </div>
  );
}

export default App;
