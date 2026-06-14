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
  where,
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

// ─── Config ────────────────────────────────────────────────────────────────
const VERCEL_URL = "https://notification-manager-ruby.vercel.app";

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
            <SidebarLink to="/admin/users"         icon="👥" onClick={closeSidebar}>Users</SidebarLink>
            <SidebarLink to="/admin/posts"         icon="📝" onClick={closeSidebar}>Posts</SidebarLink>
            <SidebarLink to="/admin/categories"    icon="🏷️" onClick={closeSidebar}>Categories</SidebarLink>
            <SidebarLink to="/admin/reports"       icon="🚩" onClick={closeSidebar}>Reports</SidebarLink>
            <SidebarLink to="/admin/notifications" icon="📢" onClick={closeSidebar}>Notifications</SidebarLink>
          </>}
          <SidebarLink to="/admin/events" icon="📅" onClick={closeSidebar}>Events</SidebarLink>
          {isAdmin && <SidebarLink to="/admin/waiting-list" icon="⏳" onClick={closeSidebar}>Waiting List</SidebarLink>}
          {isAdmin && <SidebarLink to="/admin/usernames"    icon="🏷️" onClick={closeSidebar}>Usernames</SidebarLink>}
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
            <Route path="users"         element={<Users />} />
            <Route path="posts"         element={<Posts />} />
            <Route path="categories"    element={<Categories />} />
            <Route path="reports"       element={<Reports />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="waiting-list"  element={<WaitingList />} />
            <Route path="usernames"     element={<Usernames />} />
          </>}
          <Route path="events" element={<Events user={user} />} />
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
  const [categories, setCategories] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [newUsername, setNewUsername] = useState("");
  const [searchText, setSearchText] = useState("");
  const [sortDir, setSortDir] = useState("desc");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), snapshot => {
      setUsers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "categories"), snap => {
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
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
          {u.isBusiness && (
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.textSecondary, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Managed Category
              </label>
              <select
                className="form-input"
                style={{ maxWidth: 260 }}
                value={u.managedCategoryId || ""}
                onChange={async e => await updateDoc(doc(db, "users", u.id), { managedCategoryId: e.target.value || null })}
              >
                <option value="">— None —</option>
                {categories.filter(c => c.isBusinessCategory).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
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
              {u.isBusiness && u.managedCategoryId && (
                <div style={{ fontSize: 11, color: "#a5b4fc", marginTop: 2 }}>
                  📂 {categories.find(c => c.id === u.managedCategoryId)?.name || "Unknown category"}
                </div>
              )}
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

  const toggleBusiness = async (id, current) => {
    await updateDoc(doc(db, "categories", id), { isBusinessCategory: !current });
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
              {c.isBusinessCategory && <span className="badge badge-business">Business</span>}
            </div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
              <button className="btn btn-ghost btn-sm" onClick={() => togglePinned(c.id, c.pinned)}>
                {c.pinned ? "Unpin" : "📌 Pin"}
              </button>
              {editingCategory?.id === c.id && (
                <button className="btn btn-ghost btn-sm" onClick={() => toggleBusiness(c.id, c.isBusinessCategory)}>
                  {c.isBusinessCategory ? "Unmark Business" : "🏢 Business"}
                </button>
              )}
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
function Events({ user }) {
  const isAdmin = user?.role === "admin";
  const emptyForm = { title: "", datetime: "", location: "", mapsUrl: "", info: "", cost: "", categoryId: "" };
  const [events, setEvents] = useState([]);
  const [businessCategories, setBusinessCategories] = useState([]);
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
    const unsub = onSnapshot(
      query(collection(db, "categories"), where("isBusinessCategory", "==", true)),
      snap => setBusinessCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const base = collection(db, "events");
    const q = isAdmin
      ? query(base, orderBy("createdAt", sortDir))
      : query(base, where("createdBy", "==", user.uid), orderBy("createdAt", sortDir));
    const unsub = onSnapshot(q, snap => {
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [sortDir]); // eslint-disable-line react-hooks/exhaustive-deps

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
    setForm({ title: ev.title || "", datetime: dt, location: ev.location || "", mapsUrl: ev.mapsUrl || "", info: ev.info || "", cost: ev.cost != null ? String(ev.cost) : "", categoryId: ev.categoryId || "" });
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
        categoryId: form.categoryId || null,
      };
      if (imagePublicId) payload.imagePublicId = imagePublicId;
      if (editingId) {
        await updateDoc(doc(db, "events", editingId), { ...payload, updatedAt: serverTimestamp() });
      } else {
        await addDoc(collection(db, "events"), { ...payload, createdBy: user.uid, createdAt: serverTimestamp() });
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

          {businessCategories.length > 0 && (
            <FormField label="Category (προαιρετικό)">
              <select className="form-input" value={form.categoryId}
                onChange={e => setForm({ ...form, categoryId: e.target.value })}>
                <option value="">— None —</option>
                {businessCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </FormField>
          )}

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

// ─── Notifications ───────────────────────────────────────────────────────────
const NOTIF_TYPES = [
  { value: "",                 label: "— Χωρίς τύπο —" },
  { value: "announcement",    label: "📢 Announcement" },
  { value: "like",            label: "👍 Like" },
  { value: "comment",         label: "💬 Comment" },
  { value: "comment_reply",   label: "💬 Comment Reply" },
  { value: "like_comment",    label: "❤️ Like Comment" },
  { value: "mention",         label: "📣 Mention in Comment" },
  { value: "mention_in_post", label: "📣 Mention in Post" },
  { value: "voteRG",          label: "🟢🔴 Red/Green Flag Vote" },
  { value: "voteCONF",        label: "😇😈 Confession Vote" },
  { value: "scape",           label: "⭐ Scape (selected post)" },
];

const DEEP_LINK_ACTIONS = [
  { value: "",                  label: "— Κανένα —" },
  { value: "create_confession", label: "✍️ Create Confession" },
  { value: "daily_question",    label: "❓ Daily Question" },
  { value: "curious_plus",      label: "⭐ Curious+" },
  { value: "homepage",          label: "🏠 Homepage" },
];

// Hardcoded test user (quick-send target)
const TEST_USER_ID = "v9U9FEnDgFacBJSGKTX5hl0R65g1";

const NOTIF_TEMPLATES = [
  {
    label: "🧪 Send to Greg (test)",
    color: "#94a3b8",
    colorBg: "rgba(148,163,184,0.1)",
    toUserId: TEST_USER_ID,
    form: { toUserId: TEST_USER_ID, title: "🧪 Test Notification", body: "Αυτό είναι ένα test notification.", type: "announcement", postId: "", action: "" },
  },
  {
    label: "📢 Ανακοίνωση",
    color: "#6366f1",
    colorBg: "rgba(99,102,241,0.12)",
    form: { toUserId: "all", title: "📢 Νέα Ανακοίνωση!", body: "Έχουμε κάτι νέο για εσένα. Άνοιξε το app για να δεις τι γίνεται!", type: "announcement", postId: "", action: "" },
  },
  {
    label: "❓ Daily Question",
    color: "#f59e0b",
    colorBg: "rgba(245,158,11,0.12)",
    form: { toUserId: "all", title: "❓ Ερώτηση της Ημέρας!", body: "Η ερώτηση της ημέρας σε περιμένει. Μπες και απάντησε τώρα!", type: "announcement", postId: "", action: "daily_question" },
  },
  {
    label: "🔥 Streak Reminder",
    color: "#ef4444",
    colorBg: "rgba(239,68,68,0.12)",
    form: { toUserId: "all", title: "🔥 Το streak σου κινδυνεύει!", body: "Δεν έχεις ποστάρει σήμερα. Μη το αφήσεις να σπάσει!", type: "announcement", postId: "", action: "create_confession" },
  },
  {
    label: "⭐ Curious+",
    color: "#a78bfa",
    colorBg: "rgba(167,139,250,0.12)",
    form: { toUserId: "all", title: "⭐ Ανακάλυψε το Curious+", body: "Ξεκλείδωσε premium δυνατότητες και απόλαυσε πλήρη πρόσβαση!", type: "announcement", postId: "", action: "curious_plus" },
  },
  {
    label: "🏠 Open Homepage",
    color: "#34d399",
    colorBg: "rgba(52,211,153,0.12)",
    form: { toUserId: "all", title: "👋 Γεια σου!", body: "Δες τι καινούριο υπάρχει στο CuriousApp σήμερα!", type: "announcement", postId: "", action: "homepage" },
  },
];

function Notifications() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    toUserId: "all",
    title: "",
    body: "",
    type: "",
    postId: "",
    action: "",
  });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null); // { ok, message }
  const [userSearch, setUserSearch] = useState("");

  useEffect(() => {
    getDocs(collection(db, "users")).then(snap => {
      const list = snap.docs
        .map(d => ({ id: d.id, name: d.data().name || "", email: d.data().email || "" }))
        .filter(u => u.name)
        .sort((a, b) => a.name.localeCompare(b.name));
      setUsers(list);
    });
  }, []);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  // Build the data payload that goes in the notification
  const buildData = () => {
    const data = {};
    if (form.type)   data.type   = form.type;
    if (form.postId) data.postId = form.postId.trim();
    if (form.action) data.action = form.action;
    return data;
  };

  // Helper: send a notification with an arbitrary payload
  const sendPayload = async (payload) => {
    setSending(true); setResult(null);
    try {
      const res = await fetch(`${VERCEL_URL}/send-custom-notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      setResult({ ok: res.ok, message: res.ok ? (json.message || "✅ Στάλθηκε!") : (json.error || "Κάτι πήγε λάθος.") });
    } catch (e) {
      setResult({ ok: false, message: e.message });
    } finally { setSending(false); }
  };

  // Live JSON preview
  const jsonPreview = JSON.stringify({
    toUserId: form.toUserId || "all",
    title: form.title || "...",
    body:  form.body  || "...",
    data:  buildData(),
  }, null, 2);

  const handleSend = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      setResult({ ok: false, message: "Title και Body είναι υποχρεωτικά." });
      return;
    }
    await sendPayload({
      toUserId: form.toUserId || "all",
      title:    form.title.trim(),
      body:     form.body.trim(),
      data:     buildData(),
    });
    if (true) setForm(f => ({ ...f, title: "", body: "", postId: "", action: "", type: "" }));
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const selectedUser = form.toUserId === "all" ? null : users.find(u => u.id === form.toUserId);

  return (
    <>
      <PageHeader icon="📢" title="Notifications" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>

        {/* ── Left: Form ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Recipient */}
          <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12, padding: "20px 18px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
              Παραλήπτης
            </div>

            {/* All / Specific toggle */}
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {[{ val: "all", label: "📡 Όλοι οι χρήστες" }, { val: "one", label: "👤 Συγκεκριμένος" }].map(opt => (
                <button
                  key={opt.val}
                  onClick={() => { set("toUserId", opt.val === "all" ? "all" : ""); setUserSearch(""); }}
                  style={{
                    flex: 1, padding: "9px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
                    border: `1px solid ${(opt.val === "all" ? form.toUserId === "all" : form.toUserId !== "all") ? C.accent : C.inputBorder}`,
                    background: (opt.val === "all" ? form.toUserId === "all" : form.toUserId !== "all") ? C.accentBg : "transparent",
                    color: (opt.val === "all" ? form.toUserId === "all" : form.toUserId !== "all") ? "#a5b4fc" : C.textSecondary,
                    transition: "all .15s",
                  }}
                >{opt.label}</button>
              ))}
            </div>

            {/* User search when "Specific" */}
            {form.toUserId !== "all" && (
              <div>
                <input
                  className="form-input"
                  placeholder="Αναζήτηση χρήστη…"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  style={{ marginBottom: 8 }}
                />
                {selectedUser && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: C.accentBg, borderRadius: 8, marginBottom: 8 }}>
                    <Avatar name={selectedUser.name} />
                    <span style={{ fontSize: 13, color: "#a5b4fc", fontWeight: 600 }}>{selectedUser.name}</span>
                    <button onClick={() => set("toUserId", "")} style={{ marginLeft: "auto", background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 16 }}>×</button>
                  </div>
                )}
                {userSearch && !selectedUser && (
                  <div style={{ maxHeight: 180, overflowY: "auto", border: `1px solid ${C.inputBorder}`, borderRadius: 8, background: C.inputBg }}>
                    {filteredUsers.length === 0
                      ? <div style={{ padding: "10px 14px", fontSize: 13, color: C.textMuted }}>Δεν βρέθηκαν χρήστες</div>
                      : filteredUsers.map(u => (
                          <div key={u.id}
                            onClick={() => { set("toUserId", u.id); setUserSearch(""); }}
                            style={{ padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${C.cardBorder}` }}
                            onMouseEnter={e => e.currentTarget.style.background = C.accentBg}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                          >
                            <Avatar name={u.name} />
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary }}>{u.name}</div>
                              <div style={{ fontSize: 11, color: C.textMuted }}>{u.email}</div>
                            </div>
                          </div>
                        ))
                    }
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Content */}
          <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12, padding: "20px 18px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
              Περιεχόμενο
            </div>
            <FormField label="Title *">
              <input className="form-input" placeholder="π.χ. 🚀 Νέα Ανακοίνωση!" value={form.title} onChange={e => set("title", e.target.value)} />
            </FormField>
            <FormField label="Body *">
              <textarea className="form-input" placeholder="Το κείμενο της ειδοποίησης…" value={form.body} onChange={e => set("body", e.target.value)} style={{ minHeight: 80, resize: "vertical" }} />
            </FormField>
          </div>

          {/* Data / Deep Link */}
          <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12, padding: "20px 18px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
              Deep Link / Data <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(προαιρετικό)</span>
            </div>
            <FormField label="Τύπος ειδοποίησης">
              <select className="form-input" value={form.type} onChange={e => set("type", e.target.value)}
                style={{ background: C.inputBg, color: C.textPrimary }}>
                {NOTIF_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </FormField>
            <FormField label="Post ID (ανοίγει συγκεκριμένο post)">
              <input className="form-input" placeholder="π.χ. ABC123xyz" value={form.postId} onChange={e => set("postId", e.target.value)} />
            </FormField>
            <FormField label="Action (αν δεν υπάρχει Post ID)">
              <select className="form-input" value={form.action} onChange={e => set("action", e.target.value)}
                style={{ background: C.inputBg, color: C.textPrimary }}
                disabled={!!form.postId}>
                {DEEP_LINK_ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </FormField>
          </div>

          {/* Send */}
          <button
            className="btn btn-primary btn-lg"
            onClick={handleSend}
            disabled={sending || !form.title || !form.body || (form.toUserId !== "all" && !form.toUserId)}
            style={{ width: "100%" }}
          >
            {sending ? "Αποστολή…" : form.toUserId === "all" ? "📡 Αποστολή σε όλους" : "📨 Αποστολή"}
          </button>

          {result && (
            <div style={{
              padding: "12px 16px", borderRadius: 10, fontSize: 14, fontWeight: 500,
              background: result.ok ? "rgba(34,197,94,0.1)" : C.dangerBg,
              border: `1px solid ${result.ok ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
              color: result.ok ? "#4ade80" : "#f87171",
            }}>
              {result.message}
            </div>
          )}
        </div>

        {/* ── Right: Templates + JSON Preview ── */}
        <div style={{ position: "sticky", top: 20, display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Templates */}
          <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12, padding: "20px 18px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>
              ⚡ Templates — 1 click αποστολή
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {NOTIF_TEMPLATES.map((tpl, i) => (
                <div key={i} style={{
                  borderRadius: 10, border: `1px solid ${tpl.color}30`,
                  background: tpl.colorBg, overflow: "hidden",
                }}>
                  {/* Header row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px" }}>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: C.textPrimary }}>{tpl.label}</span>
                    <button
                      onClick={() => setForm(f => ({ ...f, ...tpl.form }))}
                      style={{
                        padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
                        background: "transparent", border: `1px solid ${tpl.color}60`, color: tpl.color,
                        transition: "all .15s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = tpl.colorBg; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                    >Φόρτωση</button>
                    <button
                      onClick={() => sendPayload({
                        toUserId: tpl.form.toUserId || "all",
                        title: tpl.form.title,
                        body:  tpl.form.body,
                        data:  Object.fromEntries(
                          [["type", tpl.form.type], ["postId", tpl.form.postId], ["action", tpl.form.action]]
                            .filter(([, v]) => v)
                        ),
                      })}
                      disabled={sending}
                      style={{
                        padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: sending ? "not-allowed" : "pointer",
                        background: tpl.color, border: "none", color: "#fff", opacity: sending ? 0.5 : 1,
                        transition: "opacity .15s",
                      }}
                    >{sending ? "…" : "📡 Αποστολή"}</button>
                  </div>
                  {/* Preview text */}
                  <div style={{ padding: "0 14px 10px", borderTop: `1px solid ${tpl.color}20` }}>
                    <div style={{ fontSize: 11, color: C.textSecondary, marginTop: 8, lineHeight: 1.5 }}>
                      <span style={{ fontWeight: 600, color: C.textPrimary }}>{tpl.form.title}</span>
                      <br />
                      <span style={{ color: C.textMuted }}>{tpl.form.body}</span>
                    </div>
                    <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                      {tpl.form.action && (
                        <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 99, background: `${tpl.color}20`, color: tpl.color, fontWeight: 600 }}>
                          action: {tpl.form.action}
                        </span>
                      )}
                      {tpl.form.toUserId !== "all" && (
                        <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 99, background: "rgba(148,163,184,0.15)", color: C.textMuted, fontWeight: 600 }}>
                          👤 test user
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* JSON Preview */}
          <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12, padding: "20px 18px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>
              📋 JSON Preview
            </div>
            <pre style={{
              margin: 0, padding: "16px", borderRadius: 8, fontSize: 12, lineHeight: 1.7,
              background: C.inputBg, border: `1px solid ${C.inputBorder}`,
              color: "#a5b4fc", overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all",
            }}>
              {jsonPreview}
            </pre>

            <div style={{ marginTop: 14, padding: "12px 14px", background: "rgba(99,102,241,0.06)", borderRadius: 8, border: `1px solid rgba(99,102,241,0.15)` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Endpoint</div>
              <code style={{ fontSize: 11, color: "#a5b4fc", wordBreak: "break-all" }}>
                POST {VERCEL_URL}/send-custom-notification
              </code>
            </div>
          </div>
        </div>

      </div>
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

// ─── Waiting List ────────────────────────────────────────────────────────────
function WaitingList() {
  const [entries, setEntries] = useState([]);
  const [sortDir, setSortDir] = useState("desc");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "waitingList"), orderBy("timestamp", sortDir));
    const unsub = onSnapshot(q, snap => {
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [sortDir]);

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "waitingList", id));
    setConfirmDeleteId(null);
  };

  const handleDeleteAll = async () => {
    const batch = writeBatch(db);
    entries.forEach(e => batch.delete(doc(db, "waitingList", e.id)));
    await batch.commit();
    setConfirmDeleteAll(false);
  };

  const handleExportCSV = () => {
    const csv = ["email", ...entries.map(e => e.email || "")].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "waiting-list-emails.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const fmtDate = (ts) => {
    if (!ts) return "—";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString();
  };

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
        <PageHeader icon="⏳" title="Waiting List" count={entries.length} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")}>
            {sortDir === "desc" ? "↓ Newest" : "↑ Oldest"}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={handleExportCSV} disabled={entries.length === 0}>
            ↓ Export CSV
          </button>
          {entries.length > 0 && (
            <button className="btn btn-danger btn-sm" onClick={() => setConfirmDeleteAll(true)}>
              Delete All
            </button>
          )}
        </div>
      </div>

      {entries.length === 0 ? (
        <EmptyState icon="📭" text="No entries in the waiting list yet." />
      ) : (
        entries.map(e => (
          <div key={e.id} className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 16px" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {e.email || "—"}
              </div>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>
                {fmtDate(e.timestamp)}
              </div>
            </div>
            <button className="btn btn-danger btn-sm" style={{ flexShrink: 0 }} onClick={() => setConfirmDeleteId(e.id)}>
              Delete
            </button>
          </div>
        ))
      )}

      {confirmDeleteId && (
        <ConfirmModal
          title="Delete Entry"
          message="Are you sure you want to remove this entry from the waiting list?"
          onConfirm={() => handleDelete(confirmDeleteId)}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}

      {confirmDeleteAll && (
        <ConfirmModal
          title="Delete All Entries"
          message={`Are you sure you want to delete all ${entries.length} entries? This cannot be undone.`}
          onConfirm={handleDeleteAll}
          onCancel={() => setConfirmDeleteAll(false)}
        />
      )}
    </>
  );
}

// ─── Usernames ───────────────────────────────────────────────────────────────
const USERNAMES_PAGE = 20;

function UsernameCard({ item, onDelete }) {
  return (
    <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 16px" }}>
      <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: C.textPrimary, fontFamily: "monospace" }}>
          @{item.username}
        </span>
        {!item.assigned
          ? <span className="badge badge-free">Available</span>
          : <span className="badge badge-business">Assigned</span>}
      </div>
      <button className="btn btn-danger btn-sm" onClick={() => onDelete(item.id)}>Delete</button>
    </div>
  );
}

function Usernames() {
  const [items, setItems] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [creating, setCreating] = useState(false);
  const [duplicateError, setDuplicateError] = useState("");
  const [searchText, setSearchText] = useState("");
  const unsubRef = useRef(null);

  useEffect(() => {
    if (unsubRef.current) unsubRef.current();
    const q = query(
      collection(db, "usernames"),
      orderBy("assigned", "asc"),
      limit(USERNAMES_PAGE)
    );
    const unsub = onSnapshot(q, snap => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === USERNAMES_PAGE);
    });
    unsubRef.current = unsub;
    return () => unsub();
  }, []);

  const loadMore = async () => {
    if (!lastDoc || !hasMore || loadingMore) return;
    setLoadingMore(true);
    const q = query(
      collection(db, "usernames"),
      orderBy("assigned", "asc"),
      startAfter(lastDoc),
      limit(USERNAMES_PAGE)
    );
    const snap = await getDocs(q);
    const more = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setItems(prev => [...prev, ...more]);
    setLastDoc(snap.docs[snap.docs.length - 1] || null);
    setHasMore(snap.docs.length === USERNAMES_PAGE);
    setLoadingMore(false);
  };

  const createUsername = async () => {
    const trimmed = newUsername.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      const existing = await getDocs(query(collection(db, "usernames"), where("username", "==", trimmed)));
      if (!existing.empty) {
        setDuplicateError(`"${trimmed}" already exists.`);
        return;
      }
      await addDoc(collection(db, "usernames"), {
        username: trimmed,
        assigned: false,
      });
      setNewUsername("");
      setDuplicateError("");
    } catch (err) { console.error(err); }
    finally { setCreating(false); }
  };

  const deleteUsername = async (id) => {
    await deleteDoc(doc(db, "usernames", id));
  };

  const filtered = searchText
    ? items.filter(i => (i.username || "").toLowerCase().includes(searchText.toLowerCase()))
    : items;

  const unassigned = filtered.filter(i => !i.assigned);
  const assigned   = filtered.filter(i => i.assigned);

  return (
    <>
      <PageHeader icon="🏷️" title="Usernames" count={items.length} />

      {/* Create */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        <input
          className="form-input"
          style={{ flex: 1 }}
          placeholder="New username…"
          value={newUsername}
          onChange={e => { setNewUsername(e.target.value); setDuplicateError(""); }}
          onKeyDown={e => e.key === "Enter" && createUsername()}
        />
        <button className="btn btn-primary" onClick={createUsername} disabled={creating || !newUsername.trim()}>
          {creating ? "Creating…" : "+ Create"}
        </button>
      </div>
      {duplicateError && (
        <div style={{ marginTop: -16, marginBottom: 16, padding: "8px 12px", background: C.dangerBg, border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, color: "#f87171", fontSize: 13 }}>
          {duplicateError}
        </div>
      )}

      {/* Search */}
      <div className="search-wrap">
        <span className="search-icon">🔍</span>
        <input className="search-input" placeholder="Search usernames…"
          value={searchText} onChange={e => setSearchText(e.target.value)} />
      </div>

      {filtered.length === 0 ? <EmptyState icon="🏷️" text="No usernames found" /> : (
        <>
          {/* Unassigned at top */}
          {unassigned.length > 0 && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "0 0 12px" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#a5b4fc", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                  Available ({unassigned.length})
                </span>
                <div style={{ flex: 1, height: 1, background: "rgba(99,102,241,0.2)" }} />
              </div>
              {unassigned.map(item => <UsernameCard key={item.id} item={item} onDelete={deleteUsername} />)}
            </>
          )}

          {/* Assigned below */}
          {assigned.length > 0 && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "24px 0 12px" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                  Assigned ({assigned.length})
                </span>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
              </div>
              {assigned.map(item => <UsernameCard key={item.id} item={item} onDelete={deleteUsername} />)}
            </>
          )}

          {/* Pagination */}
          {hasMore && !searchText && (
            <div style={{ textAlign: "center", marginTop: 8 }}>
              <button className="btn btn-ghost" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
          {!hasMore && items.length > 0 && (
            <p style={{ textAlign: "center", fontSize: 13, color: C.textMuted, marginTop: 12 }}>
              All {items.length} usernames loaded
            </p>
          )}
        </>
      )}
    </>
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
