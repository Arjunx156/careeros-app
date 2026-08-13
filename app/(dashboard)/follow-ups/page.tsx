"use client";

import { useState } from "react";
import { CheckCircle2, Clock, Calendar as CalendarIcon, Briefcase, Mail, Phone, MoreHorizontal, ArrowRight, User } from "lucide-react";

// Mock Data
const MOCK_TASKS = [
  { id: 1, type: "email", title: "Send Thank You Note", context: "Senior PM at Stripe", person: "David Chen", due: "Today, 2:00 PM", priority: "high", status: "pending" },
  { id: 2, type: "call", title: "Recruiter Prep Call", context: "Frontend Role at Vercel", person: "Sarah Jenkins", due: "Tomorrow, 10:30 AM", priority: "medium", status: "pending" },
  { id: 3, type: "task", title: "Complete Take-Home Assignment", context: "Full Stack Developer at Linear", person: "", due: "Oct 15, 2023", priority: "high", status: "pending" },
  { id: 4, type: "email", title: "Follow up on Application", context: "Product Manager at Notion", person: "Emily Rodriguez", due: "Oct 16, 2023", priority: "low", status: "pending" },
  { id: 5, type: "call", title: "Coffee Chat", context: "Networking", person: "Michael Chang", due: "Oct 10, 2023", priority: "medium", status: "completed" },
];

export default function FollowUpsPage() {
  const [activeTab, setActiveTab] = useState("pending");

  const filteredTasks = MOCK_TASKS.filter(task => task.status === activeTab);

  return (
    <div style={{ padding: "32px 36px", maxWidth: "900px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#111827", marginBottom: "8px" }}>
            Tasks & Follow-Ups
          </h1>
          <p style={{ color: "#6b7280", fontSize: "15px" }}>
            Never miss an interview or networking opportunity.
          </p>
        </div>
        <button style={{ display: "flex", alignItems: "center", gap: "8px", background: "#111827", color: "white", padding: "10px 20px", borderRadius: "8px", fontSize: "14px", fontWeight: "600", border: "none", cursor: "pointer" }}>
          <Clock size={18} />
          Schedule Task
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "24px", borderBottom: "1px solid #e5e7eb", marginBottom: "24px" }}>
        <button
          onClick={() => setActiveTab("pending")}
          style={{
            padding: "0 0 12px 0",
            background: "none",
            border: "none",
            borderBottom: activeTab === "pending" ? "2px solid #2563eb" : "2px solid transparent",
            color: activeTab === "pending" ? "#2563eb" : "#6b7280",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          Upcoming Tasks
        </button>
        <button
          onClick={() => setActiveTab("completed")}
          style={{
            padding: "0 0 12px 0",
            background: "none",
            border: "none",
            borderBottom: activeTab === "completed" ? "2px solid #2563eb" : "2px solid transparent",
            color: activeTab === "completed" ? "#2563eb" : "#6b7280",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          Completed
        </button>
      </div>

      {/* Task List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {filteredTasks.map((task) => (
          <div key={task.id} style={{ display: "flex", alignItems: "center", background: "white", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)", transition: "box-shadow 0.2s, transform 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1)"; e.currentTarget.style.transform = "translateY(-2px)"; }} onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 1px 2px 0 rgba(0, 0, 0, 0.05)"; e.currentTarget.style.transform = "translateY(0)"; }}>
            
            {/* Checkbox */}
            <div style={{ marginRight: "20px" }}>
              <button style={{ width: "24px", height: "24px", borderRadius: "12px", border: task.status === 'completed' ? "none" : "2px solid #d1d5db", background: task.status === 'completed' ? "#10b981" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: "0" }}>
                {task.status === 'completed' && <CheckCircle2 size={16} color="white" />}
              </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
                <h3 style={{ fontSize: "15px", fontWeight: "600", color: task.status === 'completed' ? "#9ca3af" : "#111827", textDecoration: task.status === 'completed' ? "line-through" : "none" }}>
                  {task.title}
                </h3>
                {task.priority === 'high' && task.status !== 'completed' && (
                  <span style={{ fontSize: "11px", fontWeight: "600", color: "#ef4444", background: "#fef2f2", padding: "2px 8px", borderRadius: "9999px" }}>
                    High Priority
                  </span>
                )}
              </div>
              
              <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap", marginTop: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#6b7280" }}>
                  <Briefcase size={14} style={{ color: "#9ca3af" }} />
                  {task.context}
                </div>
                {task.person && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#6b7280" }}>
                    <User size={14} style={{ color: "#9ca3af" }} />
                    {task.person}
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: task.priority === 'high' && task.status !== 'completed' ? "#ef4444" : "#6b7280", fontWeight: task.priority === 'high' && task.status !== 'completed' ? "600" : "400" }}>
                  <CalendarIcon size={14} style={{ color: task.priority === 'high' && task.status !== 'completed' ? "#ef4444" : "#9ca3af" }} />
                  {task.due}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginLeft: "20px" }}>
              <button style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "36px", height: "36px", borderRadius: "8px", background: "#f3f4f6", color: "#4b5563", border: "none", cursor: "pointer" }} onMouseEnter={(e) => e.currentTarget.style.background = "#e5e7eb"} onMouseLeave={(e) => e.currentTarget.style.background = "#f3f4f6"}>
                <ArrowRight size={18} />
              </button>
              <button style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "36px", height: "36px", borderRadius: "8px", background: "transparent", color: "#9ca3af", border: "none", cursor: "pointer" }} onMouseEnter={(e) => e.currentTarget.style.background = "#f3f4f6"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                <MoreHorizontal size={20} />
              </button>
            </div>
          </div>
        ))}

        {filteredTasks.length === 0 && (
          <div style={{ padding: "48px", textAlign: "center", border: "2px dashed #e5e7eb", borderRadius: "12px" }}>
            <Clock size={40} style={{ color: "#d1d5db", margin: "0 auto 16px auto" }} />
            <p style={{ color: "#6b7280", fontSize: "15px", fontWeight: "500" }}>No {activeTab} tasks right now.</p>
          </div>
        )}
      </div>
    </div>
  );
}
