"use client";

import { useState } from "react";
import { Search, Plus, MoreHorizontal, Briefcase, Calendar, MapPin, Mail, Linkedin, ChevronRight } from "lucide-react";

// Mock Data
const MOCK_CONTACTS = [
  { id: 1, name: "Sarah Jenkins", role: "Engineering Manager", company: "Vercel", lastContact: "Oct 12, 2023", email: "sarah.j@example.com", status: "Hot", bg: "#fef2f2", color: "#ef4444" },
  { id: 2, name: "David Chen", role: "Senior Recruiter", company: "Stripe", lastContact: "Oct 10, 2023", email: "dchen@example.com", status: "Warm", bg: "#fff7ed", color: "#f97316" },
  { id: 3, name: "Emily Rodriguez", role: "Product Manager", company: "Linear", lastContact: "Sep 28, 2023", email: "emily.r@example.com", status: "Cold", bg: "#f3f4f6", color: "#6b7280" },
  { id: 4, name: "Michael Chang", role: "Staff Engineer", company: "Google", lastContact: "Sep 15, 2023", email: "mchang@example.com", status: "Warm", bg: "#fff7ed", color: "#f97316" },
];

export default function ContactsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredContacts = MOCK_CONTACTS.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: "32px 36px", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#111827", marginBottom: "8px" }}>
            Network & Contacts
          </h1>
          <p style={{ color: "#6b7280", fontSize: "15px" }}>
            Keep track of referrals, recruiters, and coffee chats.
          </p>
        </div>
        <button style={{ display: "flex", alignItems: "center", gap: "8px", background: "#111827", color: "white", padding: "10px 20px", borderRadius: "8px", fontSize: "14px", fontWeight: "600", border: "none", cursor: "pointer" }}>
          <Plus size={18} />
          Add Contact
        </button>
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div style={{ position: "relative", width: "350px" }}>
          <Search size={18} style={{ position: "absolute", left: "12px", top: "11px", color: "#9ca3af" }} />
          <input 
            type="text" 
            placeholder="Search names or companies..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: "100%", padding: "10px 12px 10px 40px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "14px", outline: "none" }}
          />
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <select style={{ padding: "10px 16px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "14px", outline: "none", background: "white", cursor: "pointer" }}>
            <option>All Statuses</option>
            <option>Hot</option>
            <option>Warm</option>
            <option>Cold</option>
          </select>
          <select style={{ padding: "10px 16px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "14px", outline: "none", background: "white", cursor: "pointer" }}>
            <option>Sort by: Recent</option>
            <option>Sort by: Name (A-Z)</option>
            <option>Sort by: Company</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e5e7eb", overflow: "hidden", boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb", textAlign: "left" }}>
              <th style={{ padding: "16px 24px", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Contact Info</th>
              <th style={{ padding: "16px 24px", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Relationship</th>
              <th style={{ padding: "16px 24px", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Role & Company</th>
              <th style={{ padding: "16px 24px", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Last Contacted</th>
              <th style={{ padding: "16px 24px", width: "80px" }}></th>
            </tr>
          </thead>
          <tbody>
            {filteredContacts.map((contact, index) => (
              <tr key={contact.id} style={{ borderBottom: index === filteredContacts.length - 1 ? "none" : "1px solid #e5e7eb", transition: "background 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#f9fafb"} onMouseLeave={(e) => e.currentTarget.style.background = "white"}>
                <td style={{ padding: "16px 24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "20px", background: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "600", color: "#374151" }}>
                      {contact.name.charAt(0)}
                    </div>
                    <div>
                      <p style={{ fontSize: "14px", fontWeight: "600", color: "#111827", marginBottom: "4px" }}>{contact.name}</p>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <Mail size={12} style={{ color: "#9ca3af" }} />
                        <span style={{ fontSize: "12px", color: "#6b7280" }}>{contact.email}</span>
                      </div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: "16px 24px" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", padding: "4px 10px", borderRadius: "9999px", fontSize: "12px", fontWeight: "600", background: contact.bg, color: contact.color }}>
                    {contact.status}
                  </span>
                </td>
                <td style={{ padding: "16px 24px" }}>
                  <p style={{ fontSize: "14px", color: "#111827", fontWeight: "500", marginBottom: "4px" }}>{contact.role}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#6b7280", fontSize: "13px" }}>
                    <Building2 size={14} />
                    {contact.company}
                  </div>
                </td>
                <td style={{ padding: "16px 24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#4b5563", fontSize: "14px" }}>
                    <Calendar size={16} style={{ color: "#9ca3af" }} />
                    {contact.lastContact}
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
        
        {filteredContacts.length === 0 && (
          <div style={{ padding: "48px", textAlign: "center" }}>
            <p style={{ color: "#6b7280", fontSize: "15px" }}>No contacts found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
