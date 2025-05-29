import React, { useState, useEffect } from "react";
import { HashRouter as Router, Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";
import { setPersistence, browserLocalPersistence } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";


setPersistence(auth, browserLocalPersistence);

const containerStyle = {
  maxWidth: 900,
  margin: "40px auto",
  backgroundColor: "#fff",
  borderRadius: 8,
  padding: 24,
  boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
  color: "#000",
  fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
};

const darkBackground = {
  backgroundColor: "#121212",
  minHeight: "100vh",
  color: "#fff",
  fontWeight: 600,
  fontSize: 16,
};

const headerStyle = {
  fontWeight: "700",
  marginBottom: 20,
  fontSize: 24,
  borderBottom: "2px solid #eee",
  paddingBottom: 8,
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  marginBottom: 20,
  borderRadius: 6,
  border: "1px solid #ccc",
  fontSize: 16,
  fontWeight: 600,
  outline: "none",
};

const buttonStyle = {
  padding: "8px 16px",
  borderRadius: 6,
  border: "none",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 16,
  backgroundColor: "#121212",
  color: "#fff",
  transition: "background-color 0.3s ease",
};

const buttonDangerStyle = {
  ...buttonStyle,
  backgroundColor: "#bb0000",
};

const linkStyle = {
  color: "#fff",
  textDecoration: "none",
  fontWeight: 600,
  marginRight: 20,
  fontSize: 18,
  paddingBottom: 4,
  borderBottom: "2px solid transparent",
};

const activeLinkStyle = {
  ...linkStyle,
  borderBottom: "2px solid #fff",
};

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Έλεγχος admin flag στο users collection
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists() && userDoc.data().isAdmin) {
        onLogin({ uid: user.uid, email: user.email, role: "admin" });
        navigate("/admin");
      } else {
        setError("You are not authorized as admin.");
      }
    } catch {
      setError("Invalid credentials.");
    }
  }

  return (
    <div style={{ ...darkBackground, display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
      <div style={{ backgroundColor: "#fff", padding: 40, borderRadius: 12, width: 350, color: "#121212", boxShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>
        <h2 style={{ marginBottom: 20, fontWeight: "700", fontSize: 24, textAlign: "center" }}>Admin Login</h2>
        <form onSubmit={handleSubmit}>
          <input
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            type="email"
            required
            style={inputStyle}
          />
          <input
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            type="password"
            required
            style={inputStyle}
          />
          <button type="submit" style={{ ...buttonStyle, width: "100%" }}>Login</button>
        </form>
        {error && <p style={{ color: "red", marginTop: 10, fontWeight: 700 }}>{error}</p>}
      </div>
    </div>
  );
}

function NavLink({ to, children }) {
  const currentPath = window.location.pathname;
  const isActive = currentPath === to;
  return (
    <Link to={to} style={isActive ? activeLinkStyle : linkStyle}>
      {children}
    </Link>
  );
}

function AdminPanel({ user, onLogout }) {
  const linkStyle = (isActive) => ({
    marginRight: 15,
    fontWeight: isActive ? "bold" : "normal",
    borderBottom: isActive ? "2px solid white" : "none",
    paddingBottom: 4,
    color: "white",
    textDecoration: "none",
  });

  return (
    <div style={{ padding: 20, backgroundColor: "#121212", minHeight: "100vh", color: "white" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1>Admin Console</h1>
        <button
          onClick={onLogout}
          style={{
            backgroundColor: "#ffffff",
            border: "none",
            color: "#121212",
            fontWeight: "bold",
            padding: "8px 16px",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </header>

      <nav style={{ marginBottom: 20 }}>
        <NavLink
          to="/admin/reports"
          style={({ isActive }) => linkStyle(isActive)}
          end
        >
          View Reports
        </NavLink>
        <NavLink
          to="/admin/posts"
          style={({ isActive }) => linkStyle(isActive)}
        >
          View Posts
        </NavLink>
        <NavLink
          to="/admin/users"
          style={({ isActive }) => linkStyle(isActive)}
        >
          View Users
        </NavLink>
        <NavLink
          to="/admin/categories"
          style={({ isActive }) => linkStyle(isActive)}
        >
          View Categories
        </NavLink>
      </nav>

      <Routes>
        <Route path="reports" element={<Reports />} />
        <Route path="posts" element={<Posts />} />
        <Route path="users" element={<Users />} />
        <Route path="categories" element={<Categories />} />
        <Route path="*" element={<Navigate to="/admin/reports" replace />} />
      </Routes>
    </div>
  );
}
// -- Reports tab with same styling approach --

function Reports() {
  const [reports, setReports] = useState([]);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const unsubReports = onSnapshot(collection(db, "reports"), snapshot => {
      setReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubPosts = onSnapshot(collection(db, "posts"), snapshot => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubReports();
      unsubPosts();
    };
  }, []);

  const acceptReport = async (reportId, postId) => {
    if (!reportId) return;
    if (!postId) {
      await deleteDoc(doc(db, "reports", reportId));
      return;
    }
    await deleteDoc(doc(db, "posts", postId));
    await deleteDoc(doc(db, "reports", reportId));
  };

  const ignoreReport = async (reportId) => {
    await deleteDoc(doc(db, "reports", reportId));
  };

  return (
    <>
      <h2 style={headerStyle}>Reports</h2>
      {reports.length === 0 ? (
        <p style={{ color: "#888" }}>No reports</p>
      ) : (
        <ul style={{ listStyle: "none", paddingLeft: 0 }}>
          {reports.map(r => (
            <li
              key={r.id}
              style={{
                backgroundColor: "#fff",
                color: "#121212",
                padding: 20,
                marginBottom: 16,
                borderRadius: 8,
                boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
              }}
            >
              <b>Post ID:</b> {r.postId} <br />
              <b>Post Text:</b> {r.postText || "N/A"} <br />
              <b>Author Email:</b> {r.authorEmail || "N/A"} <br />
              <b>Reporter Email:</b> {r.reporterEmail || "N/A"} <br />
              <b>Timestamp:</b> {r.timestamp ? r.timestamp.toDate().toLocaleString() : "N/A"} <br />
              <b>Reason:</b> {r.reason || "No reason"} <br />
              <button onClick={() => acceptReport(r.id, r.postId)} style={{ ...buttonDangerStyle, marginRight: 10 }}>
                Accept & Delete Post
              </button>
              <button onClick={() => ignoreReport(r.id)} style={buttonStyle}>
                Ignore
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

// -- Posts tab --
function Posts() {
  const [posts, setPosts] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null); // Για posts
  const [confirmDeleteComment, setConfirmDeleteComment] = useState(null); // Για σχόλια
  const [usernames, setUsernames] = useState({});
  const [expandedPosts, setExpandedPosts] = useState({});
  const [commentsByPost, setCommentsByPost] = useState({});
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    const unsubPosts = onSnapshot(collection(db, "posts"), (snapshot) => {
      const newPosts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setPosts(newPosts);

      const authorIds = newPosts.map((p) => p.author);
      const uniqueAuthorIds = [...new Set(authorIds)];
      uniqueAuthorIds.forEach(async (authorId) => {
        if (!usernames[authorId]) {
          const userDoc = await getDoc(doc(db, "users", authorId));
          if (userDoc.exists()) {
            setUsernames((prev) => ({
              ...prev,
              [authorId]: userDoc.data().name || "Unknown",
            }));
          } else {
            setUsernames((prev) => ({ ...prev, [authorId]: "Unknown" }));
          }
        }
      });
    });
    return () => unsubPosts();
  }, [usernames]);

  const toggleExpandPost = async (postId) => {
    setExpandedPosts((prev) => ({ ...prev, [postId]: !prev[postId] }));

    if (!expandedPosts[postId]) {
      if (!commentsByPost[postId]) {
        const commentsSnapshot = await getDocs(collection(db, "posts", postId, "comments"));
        const comments = commentsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        const commentAuthorIds = comments.map((c) => c.author);
        const uniqueCommentAuthorIds = [...new Set(commentAuthorIds)];
        for (const authorId of uniqueCommentAuthorIds) {
          if (!usernames[authorId]) {
            const userDoc = await getDoc(doc(db, "users", authorId));
            if (userDoc.exists()) {
              setUsernames((prev) => ({
                ...prev,
                [authorId]: userDoc.data().name || "Unknown",
              }));
            } else {
              setUsernames((prev) => ({ ...prev, [authorId]: "Unknown" }));
            }
          }
        }
        setCommentsByPost((prev) => ({ ...prev, [postId]: comments }));
      }
    }
  };

  const deleteComment = async (postId, commentId) => {
    try {
      await deleteDoc(doc(db, "posts", postId, "comments", commentId));
      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: prev[postId].filter((c) => c.id !== commentId),
      }));
      setConfirmDeleteComment(null);
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };

  const deletePost = async (postId) => {
    try {
      await deleteDoc(doc(db, "posts", postId));
      setConfirmDelete(null);
    } catch (err) {
      console.error("Error deleting post:", err);
    }
  };

  const filteredPosts = posts.filter((post) => {
    const text = searchText.toLowerCase();
    const authorName = usernames[post.author]?.toLowerCase() || "";
    return post.text.toLowerCase().includes(text) || authorName.includes(text);
  });

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "No date";
    if (timestamp.toDate) return timestamp.toDate().toLocaleString();
    if (timestamp instanceof Date) return timestamp.toLocaleString();
    return String(timestamp);
  };

  const buttonStyle = {
    padding: "6px 12px",
    borderRadius: 4,
    border: "none",
    cursor: "pointer",
  };

  const buttonDangerStyle = {
    ...buttonStyle,
    backgroundColor: "#d33",
    color: "white",
  };

  return (
    <>
      <h2 style={{ color: "#121212" }}>Posts</h2>
      <input
        type="text"
        placeholder="Search by post text or author..."
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        style={{
          marginBottom: 15,
          width: "100%",
          padding: 8,
          borderRadius: 6,
          border: "1px solid #ccc",
          fontSize: 16,
        }}
      />
      {filteredPosts.length === 0 ? (
        <p style={{ color: "#888" }}>No posts found</p>
      ) : (
        <ul style={{ listStyle: "none", paddingLeft: 0 }}>
          {filteredPosts.map((p) => (
            <li
              key={p.id}
              style={{
                backgroundColor: "#fff",
                color: "#121212",
                padding: 20,
                marginBottom: 16,
                borderRadius: 8,
                boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
              }}
            >
              <b>{usernames[p.author] || "Unknown"}</b>: {p.text}
              <br />
              <small style={{ color: "#555" }}>{formatTimestamp(p.timestamp)}</small>
              <br />
              <button
                style={{ ...buttonDangerStyle, marginRight: 10 }}
                onClick={() => setConfirmDelete(p.id)}
              >
                Delete Post
              </button>
              <button
                onClick={() => toggleExpandPost(p.id)}
                style={{ ...buttonStyle }}
              >
                {expandedPosts[p.id] ? "Hide Comments" : "Show Comments"}
              </button>

              {expandedPosts[p.id] && (
                <ul style={{ marginTop: 10, paddingLeft: 20 }}>
                  {commentsByPost[p.id] && commentsByPost[p.id].length > 0 ? (
                    commentsByPost[p.id].map((c) => (
                      <li
                        key={c.id}
                        style={{
                          marginBottom: 6,
                          backgroundColor: "#f9f9f9",
                          padding: 8,
                          borderRadius: 6,
                          color: "#121212",
                        }}
                      >
                        <b>{usernames[c.author] || "Unknown"}</b>: {c.text}
                        <br />
                        <small style={{ color: "#555" }}>{formatTimestamp(c.timestamp)}</small>
                        <button
                          style={{
                            ...buttonDangerStyle,
                            marginLeft: 10,
                            padding: "4px 10px",
                            fontSize: 12,
                          }}
                          onClick={() =>
                            setConfirmDeleteComment({ postId: p.id, commentId: c.id })
                          }
                        >
                          Delete Comment
                        </button>
                      </li>
                    ))
                  ) : (
                    <li style={{ fontStyle: "italic", color: "#666" }}>No comments</li>
                  )}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Confirm διαγραφή post */}
      {confirmDelete && (
        <ConfirmModal
          title="Confirm Delete Post"
          message="Are you sure you want to delete this post?"
          onConfirm={() => deletePost(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* Confirm διαγραφή comment */}
      {confirmDeleteComment && (
        <ConfirmModal
          title="Confirm Delete Comment"
          message="Are you sure you want to delete this comment?"
          onConfirm={() =>
            deleteComment(confirmDeleteComment.postId, confirmDeleteComment.commentId)
          }
          onCancel={() => setConfirmDeleteComment(null)}
        />
      )}
    </>
  );
}

function ConfirmModal({ title, message, onConfirm, onCancel }) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0, left: 0, width: "100vw", height: "100vh",
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex", justifyContent: "center", alignItems: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          backgroundColor: "#222",
          padding: 20,
          borderRadius: 8,
          width: 320,
          textAlign: "center",
          boxShadow: "0 4px 10px rgba(0,0,0,0.7)",
          color: "#eee"
        }}
      >
        <h3>{title}</h3>
        <p>{message}</p>
        <div style={{ marginTop: 20, display: "flex", justifyContent: "space-around" }}>
          <button
            onClick={onConfirm}
            style={{ padding: "8px 16px", backgroundColor: "#d33", color: "white", border: "none", borderRadius: 4 }}
          >
            Yes, Delete
          </button>
          <button
            onClick={onCancel}
            style={{ padding: "8px 16px", borderRadius: 4 }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// -- Users tab --

function Users() {
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [newUsername, setNewUsername] = useState('');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), snapshot => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  const deleteUser = async (id) => {
    await deleteDoc(doc(db, "users", id));
  };

  const startEdit = (user) => {
    setEditingUser(user);
    setNewUsername(user.name);
  };

  const saveUsername = async () => {
    await updateDoc(doc(db, "users", editingUser.id), { name: newUsername });
    setEditingUser(null);
  };

  const togglePermBan = async (userId, currentStatus) => {
    const newStatus = currentStatus === "perm" ? "none" : "perm";
    await updateDoc(doc(db, "users", userId), { banStatus: newStatus });
  };

  const filteredUsers = users.filter(user => {
    const text = searchText.toLowerCase();
    return (
      (user.name && user.name.toLowerCase().includes(text)) ||
      (user.email && user.email.toLowerCase().includes(text))
    );
  });

  return (
    <div style={{ color: "white", backgroundColor: "#121212", minHeight: "100vh", padding: 20 }}>
      <h2 style={{ fontWeight: "bold", marginBottom: 15 }}>Users</h2>
      <input
        type="text"
        placeholder="Search by name or email..."
        value={searchText}
        onChange={e => setSearchText(e.target.value)}
        style={{
          marginBottom: 15,
          width: "100%",
          padding: "10px",
          borderRadius: 6,
          border: "1px solid #444",
          backgroundColor: "#1E1E1E",
          color: "white",
          fontWeight: "bold"
        }}
      />
      {filteredUsers.length === 0 ? <p>No users found</p> : (
        <ul style={{ listStyle: "none", paddingLeft: 0 }}>
          {filteredUsers.map(u => (
            <li key={u.id} style={{ marginBottom: 20, borderBottom: "1px solid #333", paddingBottom: 12 }}>
              {editingUser?.id === u.id ? (
                <>
                  <input
                    value={newUsername}
                    onChange={e => setNewUsername(e.target.value)}
                    style={{
                      padding: "8px",
                      borderRadius: 5,
                      border: "1px solid #444",
                      backgroundColor: "#1E1E1E",
                      color: "white",
                      fontWeight: "bold",
                      marginRight: 10,
                      width: "200px"
                    }}
                  />
                  <button
                    onClick={saveUsername}
                    style={{
                      padding: "8px 12px",
                      backgroundColor: "#bb86fc",
                      border: "none",
                      color: "#121212",
                      fontWeight: "bold",
                      borderRadius: 5,
                      cursor: "pointer",
                      marginRight: 10,
                    }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingUser(null)}
                    style={{
                      padding: "8px 12px",
                      backgroundColor: "#333",
                      border: "none",
                      color: "white",
                      borderRadius: 5,
                      cursor: "pointer"
                    }}
                  >
                    Cancel
                  </button>
                  <label style={{ marginLeft: 20, userSelect: "none" }}>
                    <input
                      type="checkbox"
                      checked={u.isAdmin || false}
                      onChange={async e => {
                        await updateDoc(doc(db, "users", u.id), { isAdmin: e.target.checked });
                      }}
                      style={{ marginRight: 6 }}
                    />
                    Admin
                  </label>
                </>
              ) : (
                <>
                  <b>{u.name}</b> ({u.email}) {u.isAdmin && <span style={{ color: '#bb86fc' }}>[Admin]</span>}
                  <button
                    onClick={() => startEdit(u)}
                    style={{
                      marginLeft: 15,
                      padding: "6px 10px",
                      backgroundColor: "#444",
                      border: "none",
                      color: "white",
                      borderRadius: 5,
                      cursor: "pointer",
                      fontWeight: "bold"
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteUser(u.id)}
                    style={{
                      marginLeft: 10,
                      padding: "6px 10px",
                      backgroundColor: "#b00020",
                      border: "none",
                      color: "white",
                      borderRadius: 5,
                      cursor: "pointer",
                      fontWeight: "bold"
                    }}
                  >
                    Delete
                  </button>

                  {/* Toggle Perm Ban */}
                  <button
                    onClick={() => togglePermBan(u.id, u.banStatus)}
                    style={{
                      marginLeft: 10,
                      padding: "6px 10px",
                      backgroundColor: u.banStatus === "perm" ? "#b00020" : "#444",
                      border: "none",
                      color: "white",
                      borderRadius: 5,
                      cursor: "pointer",
                      fontWeight: "bold"
                    }}
                    title="Toggle Permanent Ban"
                  >
                    {u.banStatus === "perm" ? "Unban" : "Perm Ban"}
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// -- Categories tab --

function Categories() {
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "categories"), (snapshot) => {
      setCategories(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  const addCategory = async () => {
    if (newCategoryName.trim() === "") return;
    const newCatRef = doc(collection(db, "categories"));
    await setDoc(newCatRef, { name: newCategoryName.trim(), pinned: false });
    setNewCategoryName("");
  };

  const deleteCategory = async (id) => {
    await deleteDoc(doc(db, "categories", id));
  };

  const startEdit = (category) => {
    setEditingCategory(category);
    setNewCategoryName(category.name);
  };

  const saveCategory = async () => {
    await updateDoc(doc(db, "categories", editingCategory.id), { name: newCategoryName });
    setEditingCategory(null);
    setNewCategoryName("");
  };

  const togglePinned = async (id, currentPinned) => {
    await updateDoc(doc(db, "categories", id), { pinned: !currentPinned });
  };

  return (
    <>
      <h2 style={headerStyle}>Categories</h2>
      <div style={{ marginBottom: 20, display: "flex", gap: 12, alignItems: "center" }}>
        <input
          placeholder="New category name"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          style={{ ...inputStyle, marginBottom: 0, flex: "1 1 auto" }}
        />
        <button style={buttonStyle} onClick={addCategory}>
          Add
        </button>
      </div>
      {categories.length === 0 ? (
        <p style={{ color: "#888" }}>No categories</p>
      ) : (
        <ul style={{ listStyle: "none", paddingLeft: 0 }}>
          {categories.map((c) => (
            <li
              key={c.id}
              style={{
                backgroundColor: "#fff",
                color: "#121212",
                padding: 20,
                marginBottom: 16,
                borderRadius: 8,
                boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
              }}
            >
              {editingCategory?.id === c.id ? (
                <>
                  <input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    style={{ ...inputStyle, marginBottom: 8, flex: "1 1 auto", minWidth: 150 }}
                  />
                  <button style={buttonStyle} onClick={saveCategory}>
                    Save
                  </button>
                  <button
                    style={{ ...buttonDangerStyle, marginLeft: 10 }}
                    onClick={() => setEditingCategory(null)}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <div style={{ flex: "1 1 300px" }}>
                    <b>{c.name}</b> {c.pinned && <span style={{ color: "#bb86fc" }}>(Pinned)</span>}
                  </div>
                  <div>
                    <button
                      onClick={() => startEdit(c)}
                      style={{ ...buttonStyle, marginRight: 10 }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteCategory(c.id)}
                      style={buttonDangerStyle}
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => togglePinned(c.id, c.pinned)}
                      style={buttonStyle}
                    >
                      {c.pinned ? "Unpin" : "Pin"}
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Παρακολουθούμε το auth state
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Φόρτωσε το user doc για να δεις αν είναι admin
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userDoc.exists() && userDoc.data().isAdmin) {
          setUser({ uid: firebaseUser.uid, email: firebaseUser.email, role: "admin" });
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <div>Loading...</div>;

  // Το υπόλοιπο router όπως πριν
  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={user ? <Navigate to="/admin" /> : <Navigate to="/admin/login" />}
        />
        <Route path="/admin/login" element={<Login onLogin={setUser} />} />
        <Route
          path="/admin/*"
          element={
            user && user.role === "admin" ? (
              <AdminPanel user={user} onLogout={() => auth.signOut().then(() => setUser(null))} />
            ) : (
              <Navigate to="/admin/login" />
            )
          }
        />
      </Routes>
    </Router>
  );
}

export default App;