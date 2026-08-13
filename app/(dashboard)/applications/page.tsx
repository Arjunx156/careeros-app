"use client";

import { useState } from "react";
import { Search, Plus, MoreHorizontal, Briefcase, Calendar, MapPin, CheckCircle2, Clock, XCircle, ChevronRight } from "lucide-react";

// Mock Data
const MOCK_APPS = [
  { id: 1, role: "Senior Frontend Engineer", company: "Vercel", location: "Remote", date: "Oct 12, 2023", status: "Interviewing", color: "#3b82f6", bg: "#eff6ff" },
  { id: 2, role: "Product Manager", company: "Stripe", location: "San Francisco, CA", date: "Oct 10, 2023", status: "Applied", color: "#f59e0b", bg: "#fef3c7" },
  { id: 3, role: "Full Stack Developer", company: "Linear", location: "Remote", date: "Oct 08, 2023", status: "Offer", color: "#10b981", bg: "#d1fae5" },
  { id: 4, role: "Software Engineer II", company: "Google", location: "Mountain View, CA", date: "Oct 05, 2023", status: "Rejected", color: "#ef4444", bg: "#fee2e2" },
  { id: 5, role: "Frontend Developer", company: "Notion", location: "New York, NY", date: "Oct 01, 2023", status: "Screening", color: "#8b5cf6", bg: "#f3e8ff" },
];

export default function ApplicationsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredApps = MOCK_APPS.filter(app => 
    app.role.toLowerCase().includes(searchTerm.toLowerCase()) || 
    app.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: "32px 36px", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#111827", marginBottom: "8px" }}>
            Application Tracker
          </h1>
          <p style={{ color: "#6b7280", fontSize: "15px" }}>
            Manage and track all your job applications in one place.
          </p>
        </div>
        <button style={{ display: "flex", alignItems: "center", gap: "8px", background: "#111827", color: "white", padding: "10px 20px", borderRadius: "8px", fontSize: "14px", fontWeight: "600", border: "none", cursor: "pointer" }}>
          <Plus size={18} />
          Add Application
        </button>
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div style={{ position: "relative", width: "350px" }}>
          <Search size={18} style={{ position: "absolute", left: "12px", top: "11px", color: "#9ca3af" }} />
          <input 
            type="text" 
            placeholder="Search roles or companies..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: "100%", padding: "10px 12px 10px 40px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "14px", outline: "none" }}
          />
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <select style={{ padding: "10px 16px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "14px", outline: "none", background: "white", cursor: "pointer" }}>
            <option>All Statuses</option>
            <option>Applied</option>
            <option>Screening</option>
            <option>Interviewing</option>
            <option>Offer</option>
            <option>Rejected</option>
          </select>
          <select style={{ padding: "10px 16px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "14px", outline: "none", background: "white", cursor: "pointer" }}>
            <option>Sort by: Newest</option>
            <option>Sort by: Oldest</option>
            <option>Sort by: Status</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e5e7eb", overflow: "hidden", boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb", textAlign: "left" }}>
              <th style={{ padding: "16px 24px", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Role & Company</th>
              <th style={{ padding: "16px 24px", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Status</th>
              <th style={{ padding: "16px 24px", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Date Applied</th>
              <th style={{ padding: "16px 24px", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Location</th>
              <th style={{ padding: "16px 24px", width: "80px" }}></th>
            </tr>
          </thead>
          <tbody>
            {filteredApps.map((app, index) => (
              <tr key={app.id} style={{ borderBottom: index === filteredApps.length - 1 ? "none" : "1px solid #e5e7eb", transition: "background 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#f9fafb"} onMouseLeave={(e) => e.currentTarget.style.background = "white"}>
                <td style={{ padding: "16px 24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "8px", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "600", color: "#374151" }}>
                      {app.company.charAt(0)}
                    </div>
                    <div>
                      <p style={{ fontSize: "14px", fontWeight: "600", color: "#111827", marginBottom: "4px" }}>{app.role}</p>
                      <p style={{ fontSize: "13px", color: "#6b7280" }}>{app.company}</p>
                    </div>
                  </div>
                </td>
                <td style={{ padding: "16px 24px" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", padding: "4px 10px", borderRadius: "9999px", fontSize: "12px", fontWeight: "600", background: app.bg, color: app.color }}>
                    {app.status === 'Offer' && <CheckCircle2 size={12} style={{ marginRight: "6px" }} />}
                    {app.status === 'Applied' && <Clock size={12} style={{ marginRight: "6px" }} />}
                    {app.status === 'Rejected' && <XCircle size={12} style={{ marginRight: "6px" }} />}
                    {(app.status === 'Interviewing' || app.status === 'Screening') && <Briefcase size={12} style={{ marginRight: "6px" }} />}
                    {app.status}
                  </span>
                </td>
                <td style={{ padding: "16px 24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#4b5563", fontSize: "14px" }}>
                    <Calendar size={16} style={{ color: "#9ca3af" }} />
                    {app.date}
                  </div>
                </td>
                <td style={{ padding: "16px 24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#4b5563", fontSize: "14px" }}>
                    <MapPin size={16} style={{ color: "#9ca3af" }} />
                    {app.location}
                  </div>
                </td>
                <td style={{ padding: "16px 24px", textAlign: "right" }}>
                  <button style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", padding: "8px", borderRadius: "4px" }} onMouseEnter={(e) => e.currentTarget.style.background = "#f3f4f6"} onMouseLeave={(e) => e.currentTarget.style.background = "none"}>
                    <MoreHorizontal size={20} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredApps.length === 0 && (
          <div style={{ padding: "48px", textAlign: "center" }}>
            <p style={{ color: "#6b7280", fontSize: "15px" }}>No applications found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
