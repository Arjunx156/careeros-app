import Link from "next/link";

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        fontFamily: "'Inter', sans-serif",
        background: "linear-gradient(160deg, #0f0c29 0%, #1a1060 40%, #24243e 100%)",
        color: "white",
        overflowX: "hidden",
      }}
    >
      {/* Animated background orbs */}
      <div style={{ position: "fixed", inset: 0, overflow: "hidden", zIndex: 0, pointerEvents: "none" }}>
        <div style={{
          position: "absolute", top: "-10%", right: "5%",
          width: "600px", height: "600px",
          background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
          borderRadius: "50%",
        }} />
        <div style={{
          position: "absolute", bottom: "10%", left: "-5%",
          width: "500px", height: "500px",
          background: "radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)",
          borderRadius: "50%",
        }} />
      </div>

      {/* Nav */}
      <nav style={{
        position: "relative", zIndex: 10,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "20px 48px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "34px", height: "34px",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            borderRadius: "8px",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ color: "white", fontWeight: "800", fontSize: "16px" }}>C</span>
          </div>
          <span style={{ fontSize: "20px", fontWeight: "700", letterSpacing: "-0.3px" }}>CareerOS</span>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <Link href="/sign-in" style={{
            color: "rgba(255,255,255,0.7)", fontSize: "14px", fontWeight: "500",
            padding: "8px 16px", borderRadius: "8px", transition: "all 0.15s",
          }}>
            Sign In
          </Link>
          <Link href="/sign-up" style={{
            background: "#4f46e5", color: "white", fontSize: "14px", fontWeight: "600",
            padding: "9px 20px", borderRadius: "8px", transition: "all 0.15s",
            boxShadow: "0 4px 14px rgba(79,70,229,0.4)",
          }}>
            Get Started Free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        position: "relative", zIndex: 10,
        textAlign: "center", padding: "100px 24px 80px",
        maxWidth: "900px", margin: "0 auto",
      }}>
        {/* Pill badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)",
          borderRadius: "9999px", padding: "5px 14px", marginBottom: "28px",
          fontSize: "13px", color: "#a5b4fc",
        }}>
          <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: "#6366f1" }} />
          AI-Powered • Built for 2025 Job Market
        </div>

        <h1 style={{
          fontSize: "clamp(44px, 7vw, 72px)", fontWeight: "800",
          lineHeight: "1.1", letterSpacing: "-2px", marginBottom: "24px",
        }}>
          Your Job Search,{" "}
          <span style={{
            background: "linear-gradient(135deg, #6366f1, #a78bfa, #c084fc)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            Supercharged
          </span>
        </h1>

        <p style={{
          fontSize: "20px", color: "rgba(255,255,255,0.65)", lineHeight: "1.7",
          maxWidth: "620px", margin: "0 auto 48px",
        }}>
          Upload your resume, paste a job description, and get an AI-powered match score with
          precise recommendations. Track every application in one intelligent CRM.
        </p>

        <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/sign-up" style={{
            background: "linear-gradient(135deg, #4f46e5, #6366f1)", color: "white",
            fontSize: "16px", fontWeight: "600", padding: "14px 32px",
            borderRadius: "10px", boxShadow: "0 6px 20px rgba(79,70,229,0.5)",
            display: "inline-flex", alignItems: "center", gap: "8px",
            transition: "transform 0.15s, box-shadow 0.15s",
          }}>
            Start Free — No Credit Card
            <span style={{ fontSize: "18px" }}>→</span>
          </Link>
          <Link href="/sign-in" style={{
            background: "rgba(255,255,255,0.08)", color: "white",
            border: "1px solid rgba(255,255,255,0.15)",
            fontSize: "16px", fontWeight: "500", padding: "14px 28px",
            borderRadius: "10px", display: "inline-flex", alignItems: "center", gap: "8px",
          }}>
            Sign In
          </Link>
        </div>
      </section>

      {/* Feature grid */}
      <section style={{
        position: "relative", zIndex: 10,
        maxWidth: "1100px", margin: "0 auto", padding: "0 24px 120px",
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "20px",
        }}>
          {[
            {
              icon: "📊",
              title: "AI Resume Scorer",
              desc: "Get a real match score between your resume and any job description with detailed gap analysis.",
              color: "#6366f1",
            },
            {
              icon: "✍️",
              title: "Resume Optimizer",
              desc: "AI rewrites your resume bullet points to align with ATS keywords and hiring manager priorities.",
              color: "#8b5cf6",
            },
            {
              icon: "📋",
              title: "Application CRM",
              desc: "Track every application, interview, and follow-up in a visual Kanban-style pipeline.",
              color: "#06b6d4",
            },
            {
              icon: "🤝",
              title: "Networking Assistant",
              desc: "Generate personalized cold outreach messages for recruiters and hiring managers.",
              color: "#10b981",
            },
            {
              icon: "📈",
              title: "Analytics Dashboard",
              desc: "Understand which resume versions and application strategies actually generate interviews.",
              color: "#f59e0b",
            },
            {
              icon: "🤖",
              title: "Career Copilot",
              desc: "Ask anything about your job search — strategy, interview prep, salary negotiation.",
              color: "#ef4444",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "14px",
                padding: "24px",
                transition: "border-color 0.15s, background 0.15s",
              }}
            >
              <div style={{
                width: "44px", height: "44px",
                background: `${feature.color}20`,
                border: `1px solid ${feature.color}40`,
                borderRadius: "10px",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "22px", marginBottom: "14px",
              }}>
                {feature.icon}
              </div>
              <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "8px" }}>
                {feature.title}
              </h3>
              <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)", lineHeight: "1.6" }}>
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        position: "relative", zIndex: 10,
        textAlign: "center", padding: "32px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        color: "rgba(255,255,255,0.3)", fontSize: "13px",
      }}>
        © {new Date().getFullYear()} CareerOS. Built with AI, designed for humans.
      </footer>
    </main>
  );
}
