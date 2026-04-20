import React, { useState, useEffect } from "react";
import { HashRouter as Router, Routes, Route, Navigate, Link, useNavigate, useLocation } from "react-router-dom";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  setDoc,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";
import { setPersistence, browserLocalPersistence } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { increment, writeBatch } from "firebase/firestore";
import { uploadImageToCloudinary } from "./cloudinary";
import "./App.css";

setPersistence(auth, browserLocalPersistence);

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#0c0c14",
  sidebar: "#10101a",
  sidebarBorder: "rgba(255,255,255,0.06)",
  card: "#1a1a2e",
  cardBorder: "rgba(255,255,255,0.07)",
  accent: "#6366f1",
  accentBg: "rgba(99,102,241,0.15)",
  danger: "#ef4444",
  dangerBg: "rgba(239,68,68,0.12)",
  textPrimary: "#f1f5f9",
  textSecondary: "#94a3b8",
  textMuted: "#475569",
  inputBg: "#13131f",
  inputBorder: "rgba(255,255,255,0.1)",
};

const SIDEBAR_W = 240;

// ─── Login ────────────────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists() && userDoc.data().isAdmin) {
        onLogin({ uid: user.uid, email: user.email, role: "admin" });
        navigate("/admin");
      } else {
        setError("You are not authorized as admin.");
      }
    } catch {
      setError("Invalid credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-bg">
      <div style={{
        width: 380,
        background: "#1a1a2e",
        border: `1px solid ${C.cardBorder}`,
        borderRadius: 16,
        padding: "40px 36px",
        boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
      }}>
        {/* Logo/Icon */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 52,
            height: 52,
            background: C.accentBg,
            borderRadius: 14,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            marginBottom: 16,
            border: "1px solid rgba(99,102,241,0.3)",
          }}>
            ⚡
          </div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.textPrimary }}>
            Admin Console
          </h2>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: C.textMuted }}>
            Sign in to your admin account
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.textSecondary, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Email
            </label>
            <input
              className="form-input"
              placeholder="admin@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              type="email"
              required
            />
          </div>
          <div style={{ marginBottom: 22 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.textSecondary, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Password
            </label>
            <input
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              type="password"
              required
            />
          </div>
          <button className="btn btn-primary btn-lg" type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        {error && (
          <div style={{
            marginTop: 16,
            padding: "10px 14px",
            background: C.dangerBg,
            border: "1px solid rgba(239,68,68,0.25)",
            borderRadius: 8,
            color: "#f87171",
            fontSize: 13,
            fontWeight: 500,
          }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sidebar NavLink ──────────────────────────────────────────────────────────
function SidebarLink({ to, icon, children }) {
  const location = useLocation();
  const isActive = location.pathname === to || location.pathname.startsWith(to + "/");

  return (
    <Link to={to} className={`sidebar-link${isActive ? " active" : ""}`}>
      <span style={{ fontSize: 16, width: 20, textAlign: "center", flexShrink: 0 }}>{icon}</span>
      {children}
    </Link>
  );
}

// ─── Admin Panel Shell ────────────────────────────────────────────────────────
function AdminPanel({ user, onLogout }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: C.bg, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      {/* Sidebar */}
      <aside style={{
        width: SIDEBAR_W,
        minHeight: "100vh",
        backgroundColor: C.sidebar,
        borderRight: `1px solid ${C.sidebarBorder}`,
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 100,
      }}>
        {/* Brand */}
        <div style={{ padding: "20px 16px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 34,
              height: 34,
              background: C.accentBg,
              borderRadius: 9,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              border: "1px solid rgba(99,102,241,0.3)",
            }}>
              ⚡
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary, lineHeight: 1.2 }}>Admin</div>
              <div style={{ fontSize: 11, color: C.textMuted }}>Console</div>
            </div>
          </div>
        </div>

        <div className="divider" style={{ margin: "4px 16px 12px" }} />

        {/* Nav */}
        <nav style={{ padding: "0 8px", flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          <SidebarLink to="/admin/reports" icon="🚩">Reports</SidebarLink>
          <SidebarLink to="/admin/posts" icon="📝">Posts</SidebarLink>
          <SidebarLink to="/admin/users" icon="👥">Users</SidebarLink>
          <SidebarLink to="/admin/categories" icon="🏷️">Categories</SidebarLink>
          <SidebarLink to="/admin/events" icon="📅">Events</SidebarLink>
        </nav>

        {/* Footer - user info + logout */}
        <div style={{ padding: "12px 8px 16px", borderTop: `1px solid ${C.sidebarBorder}` }}>
          <div style={{ padding: "8px 14px", marginBottom: 4 }}>
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 2 }}>Signed in as</div>
            <div style={{ fontSize: 12, color: C.textSecondary, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user?.email}
            </div>
          </div>
          <button className="logout-btn" onClick={onLogout}>
            <span>↩</span>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ marginLeft: SIDEBAR_W, flex: 1, padding: "32px", minHeight: "100vh", color: C.textPrimary }}>
        <Routes>
          <Route path="reports" element={<Reports />} />
          <Route path="posts" element={<Posts />} />
          <Route path="users" element={<Users />} />
          <Route path="categories" element={<Categories />} />
          <Route path="events" element={<Events />} />
          <Route path="*" element={<Navigate to="/admin/reports" replace />} />
        </Routes>
      </main>
    </div>
  );
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────
function ConfirmModal({ title, message, onConfirm, onCancel }) {
  return (
    <div style={{
      position: "fixed",
      inset: 0,
      backgroundColor: "rgba(0,0,0,0.7)",
      backdropFilter: "blur(4px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
    }}>
      <div style={{
        background: "#1e1e32",
        border: `1px solid ${C.cardBorder}`,
        borderRadius: 14,
        padding: "28px 28px 24px",
        width: 360,
        boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
      }}>
        <div style={{ fontSize: 20, marginBottom: 12 }}>🗑️</div>
        <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700, color: C.textPrimary }}>{title}</h3>
        <p style={{ margin: "0 0 24px", fontSize: 14, color: C.textSecondary, lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger-solid" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ─── Reports ──────────────────────────────────────────────────────────────────
function Reports() {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    const unsubReports = onSnapshot(collection(db, "reports"), snapshot => {
      setReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubReports();
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
      <PageHeader icon="🚩" title="Reports" count={reports.length} />

      {reports.length === 0 ? (
        <EmptyState icon="✅" text="No pending reports — all clear!" />
      ) : (
        <div>
          {reports.map(r => (
            <div key={r.id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 10, fontFamily: "monospace" }}>
                    ID: {r.postId}
                  </div>
                  <InfoRow label="Post" value={r.postText || "N/A"} />
                  <InfoRow label="Author" value={r.authorEmail || "N/A"} />
                  <InfoRow label="Reporter" value={r.reporterEmail || "N/A"} />
                  <InfoRow label="Reason" value={r.reason || "No reason provided"} />
                  <InfoRow label="Date" value={r.timestamp ? r.timestamp.toDate().toLocaleString() : "N/A"} />
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button className="btn btn-danger" onClick={() => acceptReport(r.id, r.postId)}>
                    Delete Post
                  </button>
                  <button className="btn btn-ghost" onClick={() => ignoreReport(r.id)}>
                    Ignore
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ─── Posts ────────────────────────────────────────────────────────────────────
function Posts() {
  const [posts, setPosts] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmDeleteComment, setConfirmDeleteComment] = useState(null);
  const [usernames, setUsernames] = useState({});
  const [expandedPosts, setExpandedPosts] = useState({});
  const [commentsByPost, setCommentsByPost] = useState({});
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    const unsubPosts = onSnapshot(collection(db, "posts"), (snapshot) => {
      const newPosts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setPosts(newPosts);
      const uniqueAuthorIds = [...new Set(newPosts.map((p) => p.author))];
      uniqueAuthorIds.forEach(async (authorId) => {
        if (!usernames[authorId]) {
          const userDoc = await getDoc(doc(db, "users", authorId));
          setUsernames((prev) => ({
            ...prev,
            [authorId]: userDoc.exists() ? userDoc.data().name || "Unknown" : "Unknown",
          }));
        }
      });
    });
    return () => unsubPosts();
  }, [usernames]);

  const toggleExpandPost = async (postId) => {
    setExpandedPosts((prev) => ({ ...prev, [postId]: !prev[postId] }));
    if (!expandedPosts[postId] && !commentsByPost[postId]) {
      const commentsSnapshot = await getDocs(collection(db, "posts", postId, "comments"));
      const comments = commentsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const uniqueCommentAuthorIds = [...new Set(comments.map((c) => c.author))];
      for (const authorId of uniqueCommentAuthorIds) {
        if (!usernames[authorId]) {
          const userDoc = await getDoc(doc(db, "users", authorId));
          setUsernames((prev) => ({
            ...prev,
            [authorId]: userDoc.exists() ? userDoc.data().name || "Unknown" : "Unknown",
          }));
        }
      }
      setCommentsByPost((prev) => ({ ...prev, [postId]: comments }));
    }
  };

  const deleteComment = async (postId, commentId) => {
    try {
      const postRef = doc(db, "posts", postId);
      const postSnap = await getDoc(postRef);
      if (!postSnap.exists()) return;
      const postAuthor = postSnap.data().author;
      await deleteDoc(doc(db, "posts", postId, "comments", commentId));
      if (postAuthor) {
        await updateDoc(doc(db, "users", postAuthor), { commentsReceived: increment(-1) });
      }
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
      const postRef = doc(db, "posts", postId);
      const postSnap = await getDoc(postRef);
      if (!postSnap.exists()) return;
      const postData = postSnap.data();
      const postAuthor = postData.author;
      const commentsSnapshot = await getDocs(collection(db, "posts", postId, "comments"));
      const commentsCount = commentsSnapshot.size;
      const likes = postData.likes || [];
      const likesCount = likes.filter(userId => userId !== postAuthor).length;
      const userRef = doc(db, "users", postAuthor);
      const batch = writeBatch(db);
      if (commentsCount > 0) batch.update(userRef, { commentsReceived: increment(-commentsCount) });
      if (likesCount > 0) batch.update(userRef, { likesReceived: increment(-likesCount) });
      batch.delete(postRef);
      await batch.commit();
      setConfirmDelete(null);
    } catch (err) {
      console.error("Error deleting post:", err);
    }
  };

  const filteredPosts = posts.filter((post) => {
    const text = searchText.toLowerCase();
    const authorName = usernames[post.author]?.toLowerCase() || "";
    return post.text?.toLowerCase().includes(text) || authorName.includes(text);
  });

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "No date";
    if (timestamp.toDate) return timestamp.toDate().toLocaleString();
    if (timestamp instanceof Date) return timestamp.toLocaleString();
    return String(timestamp);
  };

  return (
    <>
      <PageHeader icon="📝" title="Posts" count={posts.length} />

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 20 }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.textMuted, fontSize: 14 }}>
          🔍
        </span>
        <input
          className="search-input"
          placeholder="Search posts or authors…"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </div>

      {filteredPosts.length === 0 ? (
        <EmptyState icon="📭" text="No posts found" />
      ) : (
        <div>
          {filteredPosts.map((p) => (
            <div key={p.id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: C.accentBg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#a5b4fc",
                      border: "1px solid rgba(99,102,241,0.25)",
                      flexShrink: 0,
                    }}>
                      {(usernames[p.author] || "?")[0]?.toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 600, fontSize: 14, color: C.textPrimary }}>
                      {usernames[p.author] || "Unknown"}
                    </span>
                    <span style={{ fontSize: 12, color: C.textMuted }}>
                      {formatTimestamp(p.timestamp)}
                    </span>
                  </div>
                  <p style={{ margin: "0 0 12px", fontSize: 14, color: C.textSecondary, lineHeight: 1.6 }}>
                    {p.text}
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(p.id)}>
                  Delete Post
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => toggleExpandPost(p.id)}>
                  {expandedPosts[p.id] ? "▲ Hide Comments" : "▼ Show Comments"}
                </button>
              </div>

              {expandedPosts[p.id] && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.cardBorder}` }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
                    Comments ({(commentsByPost[p.id] || []).length})
                  </div>
                  {commentsByPost[p.id] && commentsByPost[p.id].length > 0 ? (
                    commentsByPost[p.id].map((c) => (
                      <div key={c.id} className="comment-item">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontWeight: 600, fontSize: 13, color: "#a5b4fc" }}>
                              {usernames[c.author] || "Unknown"}
                            </span>
                            <span style={{ fontSize: 12, color: C.textMuted, marginLeft: 8 }}>
                              {formatTimestamp(c.timestamp)}
                            </span>
                            <p style={{ margin: "4px 0 0", fontSize: 13, color: C.textSecondary }}>
                              {c.text}
                            </p>
                          </div>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => setConfirmDeleteComment({ postId: p.id, commentId: c.id })}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p style={{ fontSize: 13, color: C.textMuted, fontStyle: "italic" }}>No comments</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete Post"
          message="This will permanently delete the post and update user stats. This cannot be undone."
          onConfirm={() => deletePost(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
      {confirmDeleteComment && (
        <ConfirmModal
          title="Delete Comment"
          message="Are you sure you want to permanently delete this comment?"
          onConfirm={() => deleteComment(confirmDeleteComment.postId, confirmDeleteComment.commentId)}
          onCancel={() => setConfirmDeleteComment(null)}
        />
      )}
    </>
  );
}

// ─── Users ────────────────────────────────────────────────────────────────────
function Users() {
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [newUsername, setNewUsername] = useState("");
  const [searchText, setSearchText] = useState("");

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
    <>
      <PageHeader icon="👥" title="Users" count={users.length} />

      <div style={{ position: "relative", marginBottom: 20 }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.textMuted, fontSize: 14 }}>
          🔍
        </span>
        <input
          className="search-input"
          placeholder="Search by name or email…"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
        />
      </div>

      {filteredUsers.length === 0 ? (
        <EmptyState icon="👤" text="No users found" />
      ) : (
        <div>
          {filteredUsers.map(u => (
            <div key={u.id} className="card">
              {editingUser?.id === u.id ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <input
                    className="form-input"
                    value={newUsername}
                    onChange={e => setNewUsername(e.target.value)}
                    style={{ flex: "1 1 180px", maxWidth: 220 }}
                    autoFocus
                  />
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: C.textSecondary, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={u.isAdmin || false}
                      onChange={async e => {
                        await updateDoc(doc(db, "users", u.id), { isAdmin: e.target.checked });
                      }}
                    />
                    Admin
                  </label>
                  <button className="btn btn-primary btn-sm" onClick={saveUsername}>Save</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditingUser(null)}>Cancel</button>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                    {/* Avatar */}
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: u.banStatus === "perm" ? "rgba(239,68,68,0.15)" : C.accentBg,
                      border: `1px solid ${u.banStatus === "perm" ? "rgba(239,68,68,0.3)" : "rgba(99,102,241,0.3)"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: 14,
                      color: u.banStatus === "perm" ? "#f87171" : "#a5b4fc",
                      flexShrink: 0,
                    }}>
                      {(u.name || "?")[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 14, color: C.textPrimary }}>{u.name || "Unnamed"}</span>
                        {u.isAdmin && <span className="badge badge-admin">Admin</span>}
                        {u.banStatus === "perm" && <span className="badge badge-banned">Banned</span>}
                      </div>
                      <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{u.email}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => startEdit(u)}>Edit</button>
                    <button
                      className="btn btn-sm"
                      style={u.banStatus === "perm"
                        ? { background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }
                        : { background: "rgba(245,158,11,0.1)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.2)" }
                      }
                      onClick={() => togglePermBan(u.id, u.banStatus)}
                    >
                      {u.banStatus === "perm" ? "Unban" : "Perm Ban"}
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => deleteUser(u.id)}>Delete</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ─── Categories ───────────────────────────────────────────────────────────────
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
      <PageHeader icon="🏷️" title="Categories" count={categories.length} />

      {/* Add new */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        <input
          className="form-input"
          placeholder="New category name…"
          value={editingCategory ? newCategoryName : newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !editingCategory && addCategory()}
          style={{ flex: 1 }}
        />
        <button
          className="btn btn-primary"
          onClick={editingCategory ? saveCategory : addCategory}
        >
          {editingCategory ? "Save" : "+ Add"}
        </button>
        {editingCategory && (
          <button className="btn btn-ghost" onClick={() => { setEditingCategory(null); setNewCategoryName(""); }}>
            Cancel
          </button>
        )}
      </div>

      {categories.length === 0 ? (
        <EmptyState icon="🏷️" text="No categories yet — add one above" />
      ) : (
        <div>
          {categories.map((c) => (
            <div key={c.id} className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 16 }}>🏷️</span>
                <span style={{ fontWeight: 600, fontSize: 14, color: C.textPrimary }}>{c.name}</span>
                {c.pinned && <span className="badge badge-pinned">Pinned</span>}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => togglePinned(c.id, c.pinned)}
                  title={c.pinned ? "Unpin" : "Pin to top"}
                >
                  {c.pinned ? "📌 Unpin" : "📌 Pin"}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => { startEdit(c); setNewCategoryName(c.name); }}>
                  Edit
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => deleteCategory(c.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ─── Events ───────────────────────────────────────────────────────────────────
function Events() {
  const emptyForm = { title: "", datetime: "", location: "", info: "", cost: "" };

  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "events"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      setEvents(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setImageFile(null);
    setImagePreview(null);
    setEditingId(null);
    setExistingImageUrl(null);
    setError("");
  };

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const startEdit = (ev) => {
    setEditingId(ev.id);
    let dt = "";
    if (ev.datetime) {
      const d = ev.datetime.toDate ? ev.datetime.toDate() : new Date(ev.datetime);
      const pad = (n) => String(n).padStart(2, "0");
      dt = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    setForm({
      title: ev.title || "",
      datetime: dt,
      location: ev.location || "",
      info: ev.info || "",
      cost: ev.cost != null ? String(ev.cost) : "",
    });
    setImageFile(null);
    setImagePreview(null);
    setExistingImageUrl(ev.imageUrl || null);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.title.trim() || !form.datetime || !form.location.trim() || !form.info.trim()) {
      setError("Please fill in title, date/time, location, and description.");
      return;
    }
    if (!editingId && !imageFile) {
      setError("Please select an image for the event.");
      return;
    }
    setSaving(true);
    try {
      let imageUrl = existingImageUrl;
      let imagePublicId = null;
      if (imageFile) {
        const uploaded = await uploadImageToCloudinary(imageFile);
        imageUrl = uploaded.url;
        imagePublicId = uploaded.publicId;
      }
      const payload = {
        title: form.title.trim(),
        datetime: Timestamp.fromDate(new Date(form.datetime)),
        location: form.location.trim(),
        info: form.info.trim(),
        cost: form.cost.trim() === "" ? null : Number(form.cost),
        imageUrl: imageUrl || null,
      };
      if (imagePublicId) payload.imagePublicId = imagePublicId;
      if (editingId) {
        await updateDoc(doc(db, "events", editingId), { ...payload, updatedAt: serverTimestamp() });
      } else {
        await addDoc(collection(db, "events"), { ...payload, createdAt: serverTimestamp() });
      }
      resetForm();
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to save event.");
    } finally {
      setSaving(false);
    }
  };

  const deleteEvent = async (id) => {
    try {
      await deleteDoc(doc(db, "events", id));
      setConfirmDeleteId(null);
    } catch (err) {
      console.error("Error deleting event:", err);
    }
  };

  const formatDT = (ts) => {
    if (!ts) return "—";
    if (ts.toDate) return ts.toDate().toLocaleString();
    return String(ts);
  };

  return (
    <>
      <PageHeader icon="📅" title="Events" count={events.length} />

      {/* Form */}
      <div style={{
        background: C.card,
        border: `1px solid ${C.cardBorder}`,
        borderRadius: 12,
        padding: 24,
        marginBottom: 32,
      }}>
        <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700, color: C.textPrimary }}>
          {editingId ? "✏️ Edit Event" : "➕ New Event"}
        </h3>
        <form onSubmit={handleSubmit}>
          <FormField label="Title *">
            <input
              className="form-input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Live Music Night"
              required
            />
          </FormField>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <FormField label="Date & Time *">
              <input
                className="form-input"
                type="datetime-local"
                value={form.datetime}
                onChange={(e) => setForm({ ...form, datetime: e.target.value })}
                required
              />
            </FormField>
            <FormField label="Cost (€) — leave blank for free">
              <input
                className="form-input"
                type="number"
                min="0"
                step="0.01"
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
                placeholder="Free if empty"
              />
            </FormField>
          </div>

          <FormField label="Location *">
            <input
              className="form-input"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="e.g. 15 Ermou St, Athens"
              required
            />
          </FormField>

          <FormField label="Description *">
            <textarea
              className="form-input"
              value={form.info}
              onChange={(e) => setForm({ ...form, info: e.target.value })}
              placeholder="Event description…"
              required
              style={{ minHeight: 100, resize: "vertical" }}
            />
          </FormField>

          <FormField label={editingId ? "Image (leave blank to keep existing)" : "Image *"}>
            <div style={{
              border: `2px dashed ${C.inputBorder}`,
              borderRadius: 8,
              padding: "20px",
              textAlign: "center",
              cursor: "pointer",
              transition: "border-color 0.15s",
            }}>
              <input
                type="file"
                accept="image/*"
                onChange={onFileChange}
                style={{ display: "none" }}
                id="event-image-upload"
              />
              <label htmlFor="event-image-upload" style={{ cursor: "pointer" }}>
                {(imagePreview || existingImageUrl) ? (
                  <img
                    src={imagePreview || existingImageUrl}
                    alt="preview"
                    style={{ maxWidth: 200, maxHeight: 140, borderRadius: 8, objectFit: "cover" }}
                  />
                ) : (
                  <div>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>🖼️</div>
                    <div style={{ fontSize: 13, color: C.textMuted }}>Click to upload an image</div>
                  </div>
                )}
              </label>
            </div>
          </FormField>

          {error && (
            <div style={{
              padding: "10px 14px",
              background: C.dangerBg,
              border: "1px solid rgba(239,68,68,0.25)",
              borderRadius: 8,
              color: "#f87171",
              fontSize: 13,
              marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? "Saving…" : editingId ? "Save Changes" : "Create Event"}
            </button>
            {editingId && (
              <button className="btn btn-ghost" type="button" onClick={resetForm} disabled={saving}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Events list */}
      <h3 style={{ fontSize: 16, fontWeight: 700, color: C.textPrimary, margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
        All Events
        <span style={{ background: C.accentBg, color: "#a5b4fc", padding: "2px 8px", borderRadius: 99, fontSize: 12 }}>
          {events.length}
        </span>
      </h3>

      {events.length === 0 ? (
        <EmptyState icon="📅" text="No events yet — create one above" />
      ) : (
        <div>
          {events.map((ev) => (
            <div key={ev.id} className="card" style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              {ev.imageUrl && (
                <img src={ev.imageUrl} alt={ev.title} className="event-image" />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: C.textPrimary, marginBottom: 8 }}>
                  {ev.title}
                </div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: C.textSecondary }}>📅 {formatDT(ev.datetime)}</span>
                  <span style={{ fontSize: 13, color: C.textSecondary }}>📍 {ev.location}</span>
                  <span className={`badge ${ev.cost == null || ev.cost === "" ? "badge-free" : ""}`} style={ev.cost != null && ev.cost !== "" ? { background: C.accentBg, color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.25)" } : {}}>
                    {ev.cost == null || ev.cost === "" ? "Free" : `€${ev.cost}`}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: C.textMuted, margin: "0 0 12px", lineHeight: 1.5 }}>{ev.info}</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => startEdit(ev)}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => setConfirmDeleteId(ev.id)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmDeleteId && (
        <ConfirmModal
          title="Delete Event"
          message="Are you sure you want to permanently delete this event?"
          onConfirm={() => deleteEvent(confirmDeleteId)}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </>
  );
}

// ─── Shared UI Helpers ────────────────────────────────────────────────────────
function PageHeader({ icon, title, count }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.textPrimary }}>{title}</h1>
        {count !== undefined && (
          <span style={{
            background: C.accentBg,
            color: "#a5b4fc",
            border: "1px solid rgba(99,102,241,0.25)",
            padding: "2px 10px",
            borderRadius: 99,
            fontSize: 12,
            fontWeight: 600,
          }}>
            {count}
          </span>
        )}
      </div>
      <div style={{ height: 1, background: "rgba(255,255,255,0.06)", marginTop: 16 }} />
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 13 }}>
      <span style={{ color: C.textMuted, minWidth: 80, flexShrink: 0 }}>{label}:</span>
      <span style={{ color: C.textSecondary }}>{value}</span>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{
        display: "block",
        fontSize: 12,
        fontWeight: 600,
        color: C.textSecondary,
        marginBottom: 6,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function EmptyState({ icon, text }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <div className="empty-state-text">{text}</div>
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
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

  if (loading) {
    return (
      <div className="loading-screen">
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚡</div>
          <div>Loading…</div>
        </div>
      </div>
    );
  }

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
