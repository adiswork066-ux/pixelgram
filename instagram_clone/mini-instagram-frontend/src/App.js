import React, { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

const API = "http://127.0.0.1:8000"; // Change to your backend URL

function App() {
  const [posts, setPosts] = useState([]);
  const [image, setImage] = useState(null);
  const [caption, setCaption] = useState("");

  // Fetch posts
  useEffect(() => {
    axios.get(`${API}/posts/`)
      .then(res => setPosts(res.data))
      .catch(err => console.log(err));
  }, []);

  // Create post
  const createPost = async () => {
    const formData = new FormData();
    formData.append("image", image);
    formData.append("caption", caption);

    try {
      await axios.post(`${API}/posts/`, formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });
      alert("Post Created!");
      window.location.reload();
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="container">
      <h1>Mini Instagram</h1>

      <div className="create-post">
        <input type="file" onChange={e => setImage(e.target.files[0])} />
        <input
          type="text"
          placeholder="Write caption..."
          value={caption}
          onChange={e => setCaption(e.target.value)}
        />
        <button onClick={createPost}>Post</button>
      </div>

      <div className="feed">
        {posts.map(post => (
          <div key={post.id} className="post">
            <img src={post.image} alt="post" />
            <p>{post.caption}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;