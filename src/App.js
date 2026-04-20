import React, { useState, useEffect, useRef } from "react";
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
  limit,
  startAfter,
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

// ─── Design Tokens ─────────────────────────────────────────────────────────
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

// ─── Login ──────────────────────────────────────────────────────────────────
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
      if (!userDoc.exists()) {
        setError("You are not authorized.");
        return;
      }
      const data = userDoc.data();
      if (data.isAdmin) {
        onLogin({ uid: user.uid, email: user.email, role: "admin" });
        navigate("/admin");
      } else if (data.isBusiness) {
        onLogin({ uid: user.uid, email: user.email, role: "business" });
        navigate("/admin/events");
      } else {
        setError("You are not authorized.");
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
        width: "100%",
        maxWidth: 380,
        background: "#1a1a2e",
        border: `1px solid ${C.cardBorder}`,
        borderRadius: 16,
        padding: "40px 32px",
        boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 52, height: 52,
            background: C.accentBg,
            borderRadius: 14,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            marginBottom: 14,
            border: "1px solid rgba(99,102,241,0.3)",
          }}>⚡</div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.textPrimary }}>Admin Console</h2>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: C.textMuted }}>Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit}>
          <FormField label="Email">
            <input className="form-input" placeholder="you@example.com" value={email}
              onChange={e => setEmail(e.target.value)} type="email" required />
          </FormField>
          <FormField label="Password">
            <input className="form-input" placeholder="••••••••" value={password}
              onChange={e => setPassword(e.target.value)} type="password" required />
          </FormField>
          <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ marginTop: 4 }}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        {error && (
          <div style={{
            marginTop: 14, padding: "10px 14px",
            background: C.dangerBg, border: "1px solid rgba(239,68,68,0.25)",
            borderRadius: 8, color: "#f87171", fontSize: 13, fontWeight: 500,
          }}>{error}</div>
        )}
      </div>
    </div>
  );
}

// ─── Sidebar NavLink ────────────────────────────────────────────────────────
function SidebarLink({ to, icon, children, onClick }) {
  const location = useLocation();
  const isActive = location.pathname === to || location.pathname.startsWith(to + "/");
  return (
    <Link to={to} className={`sidebar-link${isActive ? " active" : ""}`} onClick={onClick}>
      <span style={{ fontSize: 15, width: 20, textAlign: "center", flexShrink: 0 }}>{icon}</span>
      {children}
    </Link>
  );
}

// ─── Admin Panel Shell ──────────────────────────────────────────────────────
function AdminPanel({ user, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = () => setSidebarOpen(false);
  const isAdmin = user?.role === "admin";

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: C.bg, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      {/* Mobile overlay */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar} />}

      {/* Sidebar */}
      <aside className={`sidebar${sidebarOpen ? " open" : ""}`}>
        {/* Brand */}
        <div style={{ padding: "20px 16px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 34, height: 34, background: C.accentBg, borderRadius: 9,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, border: "1px solid rgba(99,102,241,0.3)", flexShrink: 0,
            }}>⚡</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary, lineHeight: 1.2 }}>Admin</div>
              <div style={{ fontSize: 11, color: C.textMuted }}>Console</div>
            </div>
          </div>
        </div>

        <div className="divider" style={{ margin: "4px 16px 10px" }} />

        {/* Nav */}
        <nav style={{ padding: "0 8px", flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          {isAdmin && <>
            <SidebarLink to="/admin/users"      icon="👥" onClick={closeSidebar}>Users</SidebarLink>
            <SidebarLink to="/admin/posts"      icon="📝" onClick={closeSidebar}>Posts</SidebarLink>
            <SidebarLink to="/admin/categories" icon="🏷️" onClick={closeSidebar}>Categories</SidebarLink>
            <SidebarLink to="/admin/reports"    icon="🚩" onClick={closeSidebar}>Reports</SidebarLink>
          </>}
          <SidebarLink to="/admin/events" icon="📅" onClick={closeSidebar}>Events</SidebarLink>
        </nav>

        {/* Role badge */}
        <div style={{ padding: "0 16px 10px" }}>
          <span className={isAdmin ? "badge badge-admin" : "badge badge-business"}>
            {isAdmin ? "Admin" : "Business"}
          </span>
        </div>

        {/* Footer */}
        <div style={{ padding: "10px 8px 16px", borderTop: `1px solid ${C.sidebarBorder}` }}>
          <div style={{ padding: "6px 14px 10px" }}>
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 2 }}>Signed in as</div>
            <div style={{ fontSize: 12, color: C.textSecondary, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user?.email}
            </div>
          </div>
          <button className="logout-btn" onClick={onLogout}>
            <span>↩</span> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Mobile header */}
        <div className="mobile-header">
          <button className="hamburger" onClick={() => setSidebarOpen(o => !o)}>☰</button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>⚡</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary }}>Admin Console</span>
          </div>
        </div>

        <Routes>
          {isAdmin && <>
            <Route path="users"      element={<Users />} />
            <Route path="posts"      element={<Posts />} />
            <Route path="categories" element={<Categories />} />
            <Route path="reports"    element={<Reports />} />
          </>}
          <Route path="events" element={<Events />} />
          <Route path="*" element={<Navigate to={isAdmin ? "/admin/users" : "/admin/events"} replace />} />
        </Routes>
      </main>
    </div>
  );
}

// ─── Confirm Modal ──────────────────────────────────────────────────────────
function ConfirmModal({ title, message, onConfirm, onCancel }) {
  return (
    <div style={{
      position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)",
      backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
      justifyContent: "center", zIndex: 9999, padding: 16,
    }}>
      <div style={{
        background: "#1e1e32", border: `1px solid ${C.cardBorder}`, borderRadius: 14,
        padding: "28px 24px 22px", width: "100%", maxWidth: 360,
        boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
      }}>
        <div style={{ fontSize: 22, marginBottom: 10 }}>🗑️</div>
        <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700, color: C.textPrimary }}>{title}</h3>
        <p style={{ margin: "0 0 22px", fontSize: 14, color: C.textSecondary, lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger-solid" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ─── Reports ─────────────────────────────────────────────────────────────────
function Reports() {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "reports"), snapshot => {
      setReports(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const acceptReport = async (reportId, postId) => {
    if (!reportId) return;
    if (!postId) { await deleteDoc(doc(db, "reports", reportId)); return; }
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
        reports.map(r => (
          <div key={r.id} className="card">
            <div className="report-actions" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 10, fontFamily: "monospace" }}>ID: {r.postId}</div>
                <InfoRow label="Post"     value={r.postText || "N/A"} />
                <InfoRow label="Author"   value={r.authorEmail || "N/A"} />
                <InfoRow label="Reporter" value={r.reporterEmail || "N/A"} />
                <InfoRow label="Reason"   value={r.reason || "No reason"} />
                <InfoRow label="Date"     value={r.timestamp ? r.timestamp.toDate().toLocaleString() : "N/A"} />
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
                <button className="btn btn-danger" onClick={() => acceptReport(r.id, r.postId)}>Delete Post</button>
                <button className="btn btn-ghost"  onClick={() => ignoreReport(r.id)}>Ignore</button>
              </div>
            </div>
          </div>
        ))
      )}
    </>
  );
}

// ─── Posts ───────────────────────────────────────────────────────────────────
const POSTS_PAGE = 20;

function Posts() {
  const [posts, setPosts] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sortDir, setSortDir] = useState("desc"); // desc = newest first
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmDeleteComment, setConfirmDeleteComment] = useState(null);
  const [usernames, setUsernames] = useState({});
  const [expandedPosts, setExpandedPosts] = useState({});
  const [commentsByPost, setCommentsByPost] = useState({});
  const [searchText, setSearchText] = useState("");
  const unsubRef = useRef(null);
  const usernamesRef = useRef({});

  const fetchUsernames = async (ids) => {
    const unknown = ids.filter(id => !usernamesRef.current[id]);
    await Promise.all(unknown.map(async id => {
      const ud = await getDoc(doc(db, "users", id));
      const name = ud.exists() ? ud.data().name || "Unknown" : "Unknown";
      usernamesRef.current[id] = name;
    }));
    if (unknown.length > 0) setUsernames({ ...usernamesRef.current });
  };

  useEffect(() => {
    setPosts([]);
    setLastDoc(null);
    setHasMore(true);
    if (unsubRef.current) unsubRef.current();

    const q = query(collection(db, "posts"), orderBy("timestamp", sortDir), limit(POSTS_PAGE));
    const unsub = onSnapshot(q, async snap => {
      const newPosts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPosts(newPosts);
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === POSTS_PAGE);
      await fetchUsernames([...new Set(newPosts.map(p => p.author))]);
    });
    unsubRef.current = unsub;
    return () => unsub();
  }, [sortDir]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = async () => {
    if (!lastDoc || !hasMore || loadingMore) return;
    setLoadingMore(true);
    const q = query(collection(db, "posts"), orderBy("timestamp", sortDir), startAfter(lastDoc), limit(POSTS_PAGE));
    const snap = await getDocs(q);
    const more = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setPosts(prev => [...prev, ...more]);
    setLastDoc(snap.docs[snap.docs.length - 1] || null);
    setHasMore(snap.docs.length === POSTS_PAGE);
    await fetchUsernames([...new Set(more.map(p => p.author))]);
    setLoadingMore(false);
  };

  const toggleExpand = async (postId) => {
    setExpandedPosts(prev => ({ ...prev, [postId]: !prev[postId] }));
    if (!expandedPosts[postId] && !commentsByPost[postId]) {
      const snap = await getDocs(collection(db, "posts", postId, "comments"));
      const comments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      await fetchUsernames([...new Set(comments.map(c => c.author))]);
      setCommentsByPost(prev => ({ ...prev, [postId]: comments }));
    }
  };

  const deleteComment = async (postId, commentId) => {
    try {
      const postSnap = await getDoc(doc(db, "posts", postId));
      if (!postSnap.exists()) return;
      const postAuthor = postSnap.data().author;
      await deleteDoc(doc(db, "posts", postId, "comments", commentId));
      if (postAuthor) await updateDoc(doc(db, "users", postAuthor), { commentsReceived: increment(-1) });
      setCommentsByPost(prev => ({ ...prev, [postId]: prev[postId].filter(c => c.id !== commentId) }));
      setConfirmDeleteComment(null);
    } catch (err) { console.error(err); }
  };

  const deletePost = async (postId) => {
    try {
      const postSnap = await getDoc(doc(db, "posts", postId));
      if (!postSnap.exists()) return;
      const { author, likes = [] } = postSnap.data();
      const commentsSnap = await getDocs(collection(db, "posts", postId, "comments"));
      const commentsCount = commentsSnap.size;
      const likesCount = likes.filter(uid => uid !== author).length;
      const batch = writeBatch(db);
      const userRef = doc(db, "users", author);
      if (commentsCount > 0) batch.update(userRef, { commentsReceived: increment(-commentsCount) });
      if (likesCount > 0)    batch.update(userRef, { likesReceived: increment(-likesCount) });
      batch.delete(doc(db, "posts", postId));
      await batch.commit();
      setConfirmDelete(null);
    } catch (err) { console.error(err); }
  };

  const fmt = (ts) => {
    if (!ts) return "No date";
    if (ts.toDate) return ts.toDate().toLocaleString();
    return String(ts);
  };

  const filtered = posts.filter(p => {
    const t = searchText.toLowerCase();
    return p.text?.toLowerCase().includes(t) || (usernames[p.author] || "").toLowerCase().includes(t);
  });

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 6, flexWrap: "wrap" }}>
        <PageHeader icon="📝" title="Posts" count={posts.length} />
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")}
          style={{ marginBottom: 22, flexShrink: 0 }}
        >
          {sortDir === "desc" ? "↓ NEWEST FIRST " : "↑ OLDEST FIRST"}
        </button>
      </div>

      <div className="search-wrap">
        <span className="search-icon">🔍</span>
        <input className="search-input" placeholder="Search posts or authors…"
          value={searchText} onChange={e => setSearchText(e.target.value)} />
      </div>

      {filtered.length === 0 ? <EmptyState icon="📭" text="No posts found" /> : (
        <>
          {filtered.map(p => (
            <div key={p.id} className="card">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Avatar name={usernames[p.author]} />
                <span style={{ fontWeight: 600, fontSize: 14, color: C.textPrimary }}>{usernames[p.author] || "Unknown"}</span>
                <span style={{ fontSize: 12, color: C.textMuted }}>{fmt(p.timestamp)}</span>
              </div>
              <p style={{ margin: "0 0 12px", fontSize: 14, color: C.textSecondary, lineHeight: 1.6 }}>{p.text}</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(p.id)}>Delete Post</button>
                <button className="btn btn-ghost  btn-sm" onClick={() => toggleExpand(p.id)}>
                  {expandedPosts[p.id] ? "▲ Hide Comments" : "▼ Show Comments"}
                </button>
              </div>

              {expandedPosts[p.id] && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.cardBorder}` }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
                    Comments ({(commentsByPost[p.id] || []).length})
                  </div>
                  {(commentsByPost[p.id] || []).length > 0 ? (
                    commentsByPost[p.id].map(c => (
                      <div key={c.id} className="comment-item">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ fontWeight: 600, fontSize: 13, color: "#a5b4fc" }}>{usernames[c.author] || "Unknown"}</span>
                            <span style={{ fontSize: 12, color: C.textMuted, marginLeft: 8 }}>{fmt(c.timestamp)}</span>
                            <p style={{ margin: "4px 0 0", fontSize: 13, color: C.textSecondary }}>{c.text}</p>
                          </div>
                          <button className="btn btn-danger btn-sm" style={{ flexShrink: 0 }}
                            onClick={() => setConfirmDeleteComment({ postId: p.id, commentId: c.id })}>
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

          {/* Load More */}
          {hasMore && !searchText && (
            <div style={{ textAlign: "center", marginTop: 8 }}>
              <button className="btn btn-ghost" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? "Loading…" : "Load more posts"}
              </button>
            </div>
          )}
          {!hasMore && posts.length > 0 && (
            <p style={{ textAlign: "center", fontSize: 13, color: C.textMuted, marginTop: 12 }}>
              All {posts.length} posts loaded
            </p>
          )}
        </>
      )}

      {confirmDelete && (
        <ConfirmModal title="Delete Post"
          message="This will permanently delete the post and update user stats."
          onConfirm={() => deletePost(confirmDelete)} onCancel={() => setConfirmDelete(null)} />
      )}
      {confirmDeleteComment && (
        <ConfirmModal title="Delete Comment"
          message="Are you sure you want to permanently delete this comment?"
          onConfirm={() => deleteComment(confirmDeleteComment.postId, confirmDeleteComment.commentId)}
          onCancel={() => setConfirmDeleteComment(null)} />
      )}
    </>
  );
}

// ─── Users ───────────────────────────────────────────────────────────────────
function Users() {
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [newUsername, setNewUsername] = useState("");
  const [searchText, setSearchText] = useState("");
  const [sortDir, setSortDir] = useState("desc"); // desc = newest first (by array order, unnamed last)

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), snapshot => {
      setUsers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const deleteUser = async (id) => { await deleteDoc(doc(db, "users", id)); };

  const startEdit = (user) => { setEditingUser(user); setNewUsername(user.name || ""); };

  const saveUsername = async () => {
    await updateDoc(doc(db, "users", editingUser.id), { name: newUsername });
    setEditingUser(null);
  };

  const togglePermBan = async (userId, currentStatus) => {
    await updateDoc(doc(db, "users", userId), { banStatus: currentStatus === "perm" ? "none" : "perm" });
  };

  const filtered = users.filter(u => {
    const t = searchText.toLowerCase();
    return (u.name || "").toLowerCase().includes(t) || (u.email || "").toLowerCase().includes(t);
  });

  // Separate named vs unnamed
  const named   = filtered.filter(u => u.name && u.name.trim() !== "");
  const unnamed = filtered.filter(u => !u.name || u.name.trim() === "");

  // Sort named users alphabetically or reverse
  const sortedNamed = [...named].sort((a, b) =>
    sortDir === "desc"
      ? (a.name || "").localeCompare(b.name || "")
      : (b.name || "").localeCompare(a.name || "")
  );

  const UserCard = ({ u }) => (
    <div key={u.id} className="card">
      {editingUser?.id === u.id ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <input className="form-input" value={newUsername}
              onChange={e => setNewUsername(e.target.value)}
              autoFocus style={{ flex: "1 1 180px", maxWidth: 240 }} />
            <button className="btn btn-primary btn-sm" onClick={saveUsername}>Save</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditingUser(null)}>Cancel</button>
          </div>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            <label className="check-label">
              <input type="checkbox" checked={u.isAdmin || false}
                onChange={async e => await updateDoc(doc(db, "users", u.id), { isAdmin: e.target.checked })} />
              Admin
            </label>
            <label className="check-label">
              <input type="checkbox" checked={u.isBusiness || false}
                onChange={async e => await updateDoc(doc(db, "users", u.id), { isBusiness: e.target.checked })} />
              Business
            </label>
          </div>
        </div>
      ) : (
        <div className="user-card-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
            <Avatar name={u.name || "?"} banned={u.banStatus === "perm"} />
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: u.name ? C.textPrimary : C.textMuted, fontStyle: u.name ? "normal" : "italic" }}>
                  {u.name || "Unnamed"}
                </span>
                {u.isAdmin    && <span className="badge badge-admin">Admin</span>}
                {u.isBusiness && <span className="badge badge-business">Business</span>}
                {u.banStatus === "perm" && <span className="badge badge-banned">Banned</span>}
              </div>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {u.email}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
            <button className="btn btn-ghost btn-sm" onClick={() => startEdit(u)}>Edit</button>
            <button className="btn btn-sm"
              style={u.banStatus === "perm"
                ? { background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }
                : { background: "rgba(245,158,11,0.1)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.2)" }}
              onClick={() => togglePermBan(u.id, u.banStatus)}>
              {u.banStatus === "perm" ? "Unban" : "Perm Ban"}
            </button>
            <button className="btn btn-danger btn-sm" onClick={() => deleteUser(u.id)}>Delete</button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 6, flexWrap: "wrap" }}>
        <PageHeader icon="👥" title="Users" count={users.length} />
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")}
          style={{ marginBottom: 22, flexShrink: 0 }}
        >
          {sortDir === "desc" ? "↓ A → Z" : "↑ Z → A"}
        </button>
      </div>

      <div className="search-wrap">
        <span className="search-icon">🔍</span>
        <input className="search-input" placeholder="Search by name or email…"
          value={searchText} onChange={e => setSearchText(e.target.value)} />
      </div>

      {filtered.length === 0 ? <EmptyState icon="👤" text="No users found" /> : (
        <>
          {/* Named users */}
          {sortedNamed.length > 0 && sortedNamed.map(u => <UserCard key={u.id} u={u} />)}

          {/* Unnamed users section */}
          {unnamed.length > 0 && (
            <>
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                margin: "24px 0 12px",
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                  Unnamed ({unnamed.length})
                </span>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
              </div>
              {unnamed.map(u => <UserCard key={u.id} u={u} />)}
            </>
          )}
        </>
      )}
    </>
  );
}

// ─── Categories ──────────────────────────────────────────────────────────────
function Categories() {
  const [categories, setCategories] = useState([]);
  const [inputVal, setInputVal] = useState("");
  const [editingCategory, setEditingCategory] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "categories"), snap => {
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const addCategory = async () => {
    if (!inputVal.trim()) return;
    await setDoc(doc(collection(db, "categories")), { name: inputVal.trim(), pinned: false });
    setInputVal("");
  };

  const deleteCategory = async (id) => { await deleteDoc(doc(db, "categories", id)); };

  const startEdit = (cat) => { setEditingCategory(cat); setInputVal(cat.name); };

  const saveCategory = async () => {
    await updateDoc(doc(db, "categories", editingCategory.id), { name: inputVal });
    setEditingCategory(null);
    setInputVal("");
  };

  const cancelEdit = () => { setEditingCategory(null); setInputVal(""); };

  const togglePinned = async (id, current) => {
    await updateDoc(doc(db, "categories", id), { pinned: !current });
  };

  return (
    <>
      <PageHeader icon="🏷️" title="Categories" count={categories.length} />

      <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        <input className="form-input" style={{ flex: 1 }}
          placeholder={editingCategory ? `Editing: ${editingCategory.name}` : "New category name…"}
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={e => e.key === "Enter" && (editingCategory ? saveCategory() : addCategory())} />
        <button className="btn btn-primary" onClick={editingCategory ? saveCategory : addCategory}>
          {editingCategory ? "Save" : "+ Add"}
        </button>
        {editingCategory && <button className="btn btn-ghost" onClick={cancelEdit}>Cancel</button>}
      </div>

      {categories.length === 0 ? (
        <EmptyState icon="🏷️" text="No categories yet — add one above" />
      ) : (
        categories.map(c => (
          <div key={c.id} className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 15 }}>🏷️</span>
              <span style={{ fontWeight: 600, fontSize: 14, color: C.textPrimary }}>{c.name}</span>
              {c.pinned && <span className="badge badge-pinned">Pinned</span>}
            </div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
              <button className="btn btn-ghost btn-sm" onClick={() => togglePinned(c.id, c.pinned)}>
                {c.pinned ? "Unpin" : "📌 Pin"}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => startEdit(c)}>Edit</button>
              <button className="btn btn-danger btn-sm" onClick={() => deleteCategory(c.id)}>Delete</button>
            </div>
          </div>
        ))
      )}
    </>
  );
}

// ─── Events ──────────────────────────────────────────────────────────────────
function Events() {
  const emptyForm = { title: "", datetime: "", location: "", mapsUrl: "", info: "", cost: "" };
  const [events, setEvents] = useState([]);
  const [sortDir, setSortDir] = useState("desc");
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "events"), orderBy("createdAt", sortDir));
    const unsub = onSnapshot(q, snap => {
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [sortDir]);

  const resetForm = () => {
    setForm(emptyForm); setImageFile(null); setImagePreview(null);
    setEditingId(null); setExistingImageUrl(null); setError("");
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
      const pad = n => String(n).padStart(2, "0");
      dt = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    setForm({ title: ev.title || "", datetime: dt, location: ev.location || "", mapsUrl: ev.mapsUrl || "", info: ev.info || "", cost: ev.cost != null ? String(ev.cost) : "" });
    setImageFile(null); setImagePreview(null); setExistingImageUrl(ev.imageUrl || null); setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError("");
    if (!form.title.trim() || !form.datetime || !form.location.trim() || !form.info.trim()) {
      setError("Please fill in title, date/time, location, and description.");
      return;
    }
    if (!editingId && !imageFile) { setError("Please select an image for the event."); return; }
    setSaving(true);
    try {
      let imageUrl = existingImageUrl, imagePublicId = null;
      if (imageFile) {
        const up = await uploadImageToCloudinary(imageFile);
        imageUrl = up.url; imagePublicId = up.publicId;
      }
      const payload = {
        title: form.title.trim(),
        datetime: Timestamp.fromDate(new Date(form.datetime)),
        location: form.location.trim(),
        mapsUrl: form.mapsUrl.trim() || null,
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
    } catch (err) { console.error(err); setError(err.message || "Failed to save event."); }
    finally { setSaving(false); }
  };

  const deleteEvent = async (id) => {
    try { await deleteDoc(doc(db, "events", id)); setConfirmDeleteId(null); }
    catch (err) { console.error(err); }
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
      <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12, padding: "22px 20px", marginBottom: 32 }}>
        <h3 style={{ margin: "0 0 18px", fontSize: 15, fontWeight: 700, color: C.textPrimary }}>
          {editingId ? "✏️ Edit Event" : "➕ New Event"}
        </h3>
        <form onSubmit={handleSubmit}>
          <FormField label="Title *">
            <input className="form-input" value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Live Music Night" required />
          </FormField>

          <div className="events-grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <FormField label="Date & Time *">
              <input className="form-input" type="datetime-local" value={form.datetime}
                onChange={e => setForm({ ...form, datetime: e.target.value })} required />
            </FormField>
            <FormField label="Cost (€) — blank = free">
              <input className="form-input" type="number" min="0" step="0.01" value={form.cost}
                onChange={e => setForm({ ...form, cost: e.target.value })} placeholder="Free if empty" />
            </FormField>
          </div>

          <FormField label="Location *">
            <input className="form-input" value={form.location}
              onChange={e => setForm({ ...form, location: e.target.value })}
              placeholder="e.g. 15 Ermou St, Athens" required />
          </FormField>

          <FormField label="Google Maps Link (προαιρετικό)">
            <input className="form-input" type="url" value={form.mapsUrl}
              onChange={e => setForm({ ...form, mapsUrl: e.target.value })}
              placeholder="https://maps.google.com/..." />
          </FormField>

          <FormField label="Description *">
            <textarea className="form-input" value={form.info}
              onChange={e => setForm({ ...form, info: e.target.value })}
              placeholder="Event description…" required style={{ minHeight: 90, resize: "vertical" }} />
          </FormField>

          <FormField label={editingId ? "Image (blank = keep existing)" : "Image *"}>
            <label htmlFor="ev-img" style={{
              display: "block", border: `2px dashed ${C.inputBorder}`, borderRadius: 8,
              padding: 20, textAlign: "center", cursor: "pointer",
            }}>
              <input type="file" accept="image/*" onChange={onFileChange} id="ev-img" style={{ display: "none" }} />
              {(imagePreview || existingImageUrl) ? (
                <img src={imagePreview || existingImageUrl} alt="preview"
                  style={{ maxWidth: "100%", maxHeight: 140, borderRadius: 8, objectFit: "cover" }} />
              ) : (
                <>
                  <div style={{ fontSize: 26, marginBottom: 6 }}>🖼️</div>
                  <div style={{ fontSize: 13, color: C.textMuted }}>Click to upload image</div>
                </>
              )}
            </label>
          </FormField>

          {error && (
            <div style={{ padding: "10px 14px", background: C.dangerBg, border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, color: "#f87171", fontSize: 13, marginBottom: 14 }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? "Saving…" : editingId ? "Save Changes" : "Create Event"}
            </button>
            {editingId && <button className="btn btn-ghost" type="button" onClick={resetForm} disabled={saving}>Cancel</button>}
          </div>
        </form>
      </div>

      {/* List header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          All Events
          <span style={{ background: C.accentBg, color: "#a5b4fc", padding: "2px 8px", borderRadius: 99, fontSize: 12 }}>{events.length}</span>
        </h3>
        <button className="btn btn-ghost btn-sm" onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")}>
          {sortDir === "desc" ? "↓ Νεότερα πρώτα" : "↑ Παλαιότερα πρώτα"}
        </button>
      </div>

      {events.length === 0 ? <EmptyState icon="📅" text="No events yet — create one above" /> : (
        events.map(ev => (
          <div key={ev.id} className="card">
            <div className="event-card-row" style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              {ev.imageUrl && <img src={ev.imageUrl} alt={ev.title} className="event-image" />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: C.textPrimary, marginBottom: 6 }}>{ev.title}</div>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: C.textSecondary }}>📅 {formatDT(ev.datetime)}</span>
                  <span style={{ fontSize: 13, color: C.textSecondary }}>
                    📍{" "}
                    {ev.mapsUrl
                      ? <a href={ev.mapsUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#a5b4fc", textDecoration: "none" }}>{ev.location}</a>
                      : ev.location}
                  </span>
                  <span className={ev.cost == null || ev.cost === "" ? "badge badge-free" : "badge badge-admin"}>
                    {ev.cost == null || ev.cost === "" ? "Free" : `€${ev.cost}`}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: C.textMuted, margin: "0 0 10px", lineHeight: 1.5 }}>{ev.info}</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-ghost btn-sm"  onClick={() => startEdit(ev)}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => setConfirmDeleteId(ev.id)}>Delete</button>
                </div>
              </div>
            </div>
          </div>
        ))
      )}

      {confirmDeleteId && (
        <ConfirmModal title="Delete Event"
          message="Are you sure you want to permanently delete this event?"
          onConfirm={() => deleteEvent(confirmDeleteId)} onCancel={() => setConfirmDeleteId(null)} />
      )}
    </>
  );
}

// ─── Shared Helpers ──────────────────────────────────────────────────────────
function Avatar({ name, banned }) {
  return (
    <div style={{
      width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
      background: banned ? "rgba(239,68,68,0.15)" : "rgba(99,102,241,0.15)",
      border: `1px solid ${banned ? "rgba(239,68,68,0.3)" : "rgba(99,102,241,0.3)"}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 700, fontSize: 13,
      color: banned ? "#f87171" : "#a5b4fc",
    }}>
      {(name || "?")[0]?.toUpperCase()}
    </div>
  );
}

function PageHeader({ icon, title, count }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <h1 style={{ margin: 0, fontSize: 21, fontWeight: 700, color: C.textPrimary }}>{title}</h1>
        {count !== undefined && (
          <span style={{ background: C.accentBg, color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.25)", padding: "2px 10px", borderRadius: 99, fontSize: 12, fontWeight: 600 }}>
            {count}
          </span>
        )}
      </div>
      <div style={{ height: 1, background: "rgba(255,255,255,0.06)", marginTop: 14 }} />
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 5, fontSize: 13 }}>
      <span style={{ color: C.textMuted, minWidth: 70, flexShrink: 0 }}>{label}:</span>
      <span style={{ color: C.textSecondary }}>{value}</span>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.textSecondary, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>
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

// ─── App Root ────────────────────────────────────────────────────────────────
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.isAdmin) {
            setUser({ uid: firebaseUser.uid, email: firebaseUser.email, role: "admin" });
          } else if (data.isBusiness) {
            setUser({ uid: firebaseUser.uid, email: firebaseUser.email, role: "business" });
          } else {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="loading-screen">
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>⚡</div>
          <div>Loading…</div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={user ? <Navigate to="/admin" /> : <Navigate to="/admin/login" />} />
        <Route path="/admin/login" element={<Login onLogin={setUser} />} />
        <Route
          path="/admin/*"
          element={
            user ? (
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
