"use client";

import { useState } from "react";
import { Sparkles, FileText, Building2, Briefcase, ChevronRight, Loader2 } from "lucide-react";

export default function JobAnalyzerPage() {
  const [analyzing, setAnalyzing] = useState(false);
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [description, setDescription] = useState("");

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    setAnalyzing(true);
    // Simulate AI analysis delay
    setTimeout(() => {
      setAnalyzing(false);
      // In a real app, this would set the analysis results and transition the view
      alert("Analysis complete! (Placeholder)");
    }, 3000);
  };

  return (
    <div style={{ padding: "32px 36px", maxWidth: "1000px", margin: "0 auto" }}>
      <div style={{ marginBottom: "32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#111827", marginBottom: "8px" }}>
            Job Analyzer
          </h1>
          <p style={{ color: "#6b7280", fontSize: "15px" }}>
            Compare your resume against a specific job description.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f3f4f6", padding: "8px 16px", borderRadius: "20px" }}>
          <Sparkles size={16} style={{ color: "#8b5cf6" }} />
          <span style={{ fontSize: "14px", fontWeight: "600", color: "#4b5563" }}>Gemini Pro Ready</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 350px", gap: "32px" }}>
        {/* Main Input Form */}
        <div style={{ background: "white", borderRadius: "16px", padding: "32px", border: "1px solid #e5e7eb", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)" }}>
          <form onSubmit={handleAnalyze}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                  Job Title
                </label>
                <div style={{ position: "relative" }}>
                  <Briefcase size={18} style={{ position: "absolute", left: "12px", top: "11px", color: "#9ca3af" }} />
                  <input
                    type="text"
                    required
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Senior Product Manager"
                    style={{ width: "100%", padding: "10px 12px 10px 40px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "14px", outline: "none" }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                  Company
                </label>
                <div style={{ position: "relative" }}>
                  <Building2 size={18} style={{ position: "absolute", left: "12px", top: "11px", color: "#9ca3af" }} />
                  <input
                    type="text"
                    required
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Google"
                    style={{ width: "100%", padding: "10px 12px 10px 40px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "14px", outline: "none" }}
                  />
                </div>
              </div>
            </div>

            <div style={{ marginBottom: "32px" }}>
              <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                Job Description
              </label>
              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Paste the full job description here..."
                style={{ width: "100%", height: "250px", padding: "16px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "14px", outline: "none", resize: "none", fontFamily: "inherit" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="submit"
                disabled={analyzing || !jobTitle || !company || !description}
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  background: analyzing ? "#9ca3af" : "#2563eb",
                  color: "white", padding: "12px 24px", borderRadius: "8px",
                  fontSize: "15px", fontWeight: "600", cursor: analyzing ? "not-allowed" : "pointer",
                  transition: "background 0.2s"
                }}
              >
                {analyzing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Analyzing Match...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Run AI Analysis
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Sidebar Info */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ background: "white", borderRadius: "16px", padding: "24px", border: "1px solid #e5e7eb", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <FileText size={18} style={{ color: "#2563eb" }} />
              Active Resume
            </h3>
            <div style={{ padding: "16px", background: "#f9fafb", border: "1px solid #f3f4f6", borderRadius: "8px" }}>
              <p style={{ fontSize: "14px", fontWeight: "500", color: "#374151" }}>Master Resume.pdf</p>
              <p style={{ fontSize: "13px", color: "#6b7280", marginTop: "4px" }}>Last updated 2 days ago</p>
            </div>
            <button style={{ marginTop: "16px", fontSize: "14px", color: "#2563eb", fontWeight: "500", display: "flex", alignItems: "center" }}>
              Change resume <ChevronRight size={16} />
            </button>
          </div>

          <div style={{ background: "linear-gradient(to bottom right, #f8fafc, #f1f5f9)", borderRadius: "16px", padding: "24px", border: "1px solid #e2e8f0" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#1e293b", marginBottom: "12px" }}>
              What happens next?
            </h3>
            <ul style={{ fontSize: "14px", color: "#475569", display: "flex", flexDirection: "column", gap: "12px", paddingLeft: "0", listStyle: "none" }}>
              <li style={{ display: "flex", gap: "8px" }}>
                <span style={{ color: "#3b82f6" }}>1.</span> We'll score your resume against this specific role.
              </li>
              <li style={{ display: "flex", gap: "8px" }}>
                <span style={{ color: "#3b82f6" }}>2.</span> You'll get actionable, line-by-line feedback.
              </li>
              <li style={{ display: "flex", gap: "8px" }}>
                <span style={{ color: "#3b82f6" }}>3.</span> Generate a highly tailored resume version instantly.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
