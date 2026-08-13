"use client";

import { useState } from "react";
import { UploadDropzone } from "@/lib/uploadthing";
import { FileText, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function ResumeLibraryPage() {
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");

  return (
    <div style={{ padding: "32px 36px" }}>
      <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#111827", marginBottom: "8px" }}>
        Resume Library
      </h1>
      <p style={{ color: "#6b7280", fontSize: "15px", marginBottom: "32px" }}>
        Upload and manage your resume versions here.
      </p>

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: "16px",
          padding: "32px",
          background: "white",
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)",
        }}
      >
        <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#374151", marginBottom: "24px" }}>
          Upload New Resume
        </h2>
        
        <UploadDropzone
          endpoint="resumeUploader"
          onUploadBegin={() => setUploadStatus("uploading")}
          onClientUploadComplete={(res) => {
            console.log("Files: ", res);
            setUploadStatus("success");
            // Reset status after a few seconds
            setTimeout(() => setUploadStatus("idle"), 3000);
          }}
          onUploadError={(error: Error) => {
            console.error(error);
            setUploadStatus("error");
            setTimeout(() => setUploadStatus("idle"), 5000);
          }}
          appearance={{
            container: {
              border: "2px dashed #d1d5db",
              borderRadius: "12px",
              padding: "48px 24px",
              background: "#f9fafb",
            },
            label: {
              color: "#374151",
              fontSize: "16px",
              fontWeight: "500",
            },
            allowedContent: {
              color: "#6b7280",
              fontSize: "14px",
            },
            button: {
              background: "#2563eb",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "500",
              padding: "8px 16px",
            }
          }}
        />

        {uploadStatus === "uploading" && (
          <div style={{ marginTop: "16px", display: "flex", alignItems: "center", gap: "8px", color: "#2563eb" }}>
            <Loader2 className="animate-spin" size={20} />
            <span style={{ fontSize: "14px", fontWeight: "500" }}>Uploading your resume...</span>
          </div>
        )}

        {uploadStatus === "success" && (
          <div style={{ marginTop: "16px", display: "flex", alignItems: "center", gap: "8px", color: "#10b981" }}>
            <CheckCircle2 size={20} />
            <span style={{ fontSize: "14px", fontWeight: "500" }}>Resume uploaded successfully!</span>
          </div>
        )}

        {uploadStatus === "error" && (
          <div style={{ marginTop: "16px", display: "flex", alignItems: "center", gap: "8px", color: "#ef4444" }}>
            <AlertCircle size={20} />
            <span style={{ fontSize: "14px", fontWeight: "500" }}>Upload failed. Please try again.</span>
          </div>
        )}
      </div>
    </div>
  );
}
