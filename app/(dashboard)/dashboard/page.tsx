import Link from "next/link";

export default function DashboardPage() {
  const firstName = "there";

  const stats = [
    { label: "Total Applications", value: "0", icon: "📋", change: null, href: "/applications" },
    { label: "Active Interviews", value: "0", icon: "🎯", change: null, href: "/applications" },
    { label: "Resumes Uploaded", value: "0", icon: "📄", change: null, href: "/resume-library" },
    { label: "Network Contacts", value: "0", icon: "🤝", change: null, href: "/contacts" },
  ];

  const quickActions = [
    {
      title: "Analyze a Job",
      desc: "Paste a job description and get your AI match score instantly",
      icon: "🔍",
      href: "/job-analyzer",
      color: "#4f46e5",
      bg: "#eef2ff",
      border: "#c7d2fe",
      cta: "Start Analysis",
    },
    {
      title: "Upload Resume",
      desc: "Add your master resume to the library as the AI foundation",
      icon: "📄",
      href: "/resume-library",
      color: "#059669",
      bg: "#ecfdf5",
      border: "#a7f3d0",
      cta: "Add Resume",
    },
    {
      title: "Track Application",
      desc: "Log a new job application and start tracking its progress",
      icon: "✅",
      href: "/applications",
      color: "#2563eb",
      bg: "#eff6ff",
      border: "#bfdbfe",
      cta: "Add Application",
    },
    {
      title: "Add Contact",
      desc: "Save a recruiter or hiring manager contact for follow-ups",
      icon: "👥",
      href: "/contacts",
      color: "#d97706",
      bg: "#fffbeb",
      border: "#fde68a",
      cta: "Add Contact",
    },
  ];

  return (
    <div style={{ padding: "32px 36px", maxWidth: "1200px" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "26px", fontWeight: "700", color: "#111827", marginBottom: "4px" }}>
          Good {getGreeting()}, {firstName}! 👋
        </h1>
        <p style={{ color: "#6b7280", fontSize: "15px" }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          {" "}— Here&apos;s your career dashboard.
        </p>
      </div>

      {/* Getting Started Banner (shown when no data) */}
      <div
        style={{
          background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #7c3aed 100%)",
          borderRadius: "14px",
          padding: "28px 32px",
          marginBottom: "32px",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "20px",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "11px",
              fontWeight: "700",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              opacity: 0.75,
              marginBottom: "8px",
            }}
          >
            Getting Started
          </div>
          <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "6px" }}>
            Your CareerOS is ready. Let&apos;s fill it.
          </h2>
          <p style={{ opacity: 0.8, fontSize: "14px", maxWidth: "480px" }}>
            Start by uploading your master resume, then paste a job description to see your
            AI match score and optimize your application.
          </p>
        </div>
        <Link
          href="/job-analyzer"
          style={{
            background: "white",
            color: "#4f46e5",
            fontWeight: "700",
            fontSize: "14px",
            padding: "12px 24px",
            borderRadius: "8px",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            flexShrink: 0,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
        >
          Analyze First Job →
        </Link>
      </div>

      {/* Stats Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          marginBottom: "32px",
        }}
      >
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} style={{ textDecoration: "none" }}>
            <div
              className="card card-hover"
              style={{ cursor: "pointer" }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <span style={{ fontSize: "22px" }}>{stat.icon}</span>
                <span
                  style={{
                    fontSize: "11px",
                    color: "#9ca3af",
                    background: "#f3f4f6",
                    padding: "3px 8px",
                    borderRadius: "9999px",
                    fontWeight: "500",
                  }}
                >
                  All time
                </span>
              </div>
              <div style={{ fontSize: "30px", fontWeight: "800", color: "#111827", marginBottom: "4px" }}>
                {stat.value}
              </div>
              <div style={{ fontSize: "13px", color: "#6b7280" }}>{stat.label}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: "32px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#111827", marginBottom: "14px" }}>
          Quick Actions
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "14px",
          }}
        >
          {quickActions.map((action) => (
            <Link key={action.title} href={action.href} style={{ textDecoration: "none" }}>
              <div
                className="card card-hover"
                style={{
                  border: `1px solid ${action.border}`,
                  background: action.bg,
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: "26px", marginBottom: "10px" }}>{action.icon}</div>
                <h3 style={{ fontSize: "15px", fontWeight: "600", color: "#111827", marginBottom: "6px" }}>
                  {action.title}
                </h3>
                <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "14px", lineHeight: "1.5" }}>
                  {action.desc}
                </p>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: "600",
                    color: action.color,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  {action.cta} →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Setup Checklist */}
      <div>
        <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#111827", marginBottom: "14px" }}>
          Setup Checklist
        </h2>
        <div className="card">
          <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
            {[
              { label: "Upload your master resume", href: "/resume-library", done: false },
              { label: "Run your first AI job analysis", href: "/job-analyzer", done: false },
              { label: "Add your first job application", href: "/applications", done: false },
              { label: "Add a networking contact", href: "/contacts", done: false },
            ].map((item, i) => (
              <Link
                key={i}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 0",
                  borderBottom: i < 3 ? "1px solid #f3f4f6" : "none",
                  textDecoration: "none",
                }}
              >
                <div
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    border: item.done ? "none" : "2px solid #d1d5db",
                    background: item.done ? "#4f46e5" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {item.done && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20,6 9,17 4,12" />
                    </svg>
                  )}
                </div>
                <span style={{
                  fontSize: "14px",
                  color: item.done ? "#9ca3af" : "#374151",
                  textDecoration: item.done ? "line-through" : "none",
                  fontWeight: "500",
                }}>
                  {item.label}
                </span>
                <span style={{ marginLeft: "auto", color: "#9ca3af", fontSize: "14px" }}>→</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
