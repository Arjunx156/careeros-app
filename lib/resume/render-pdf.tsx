import "server-only";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { OptimizedResume } from "@/lib/resume/optimized-schema";

/**
 * ATS-safe PDF.
 *
 * Deliberately plain: single column, real text in reading order, no tables, no
 * text boxes, no columns, no graphics. Every one of those breaks the parsers
 * this document has to survive before a human sees it — which is the same list
 * of problems lib/analysis/deterministic.ts flags on an uploaded resume.
 */

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 48,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#111827",
    lineHeight: 1.4,
  },
  name: { fontSize: 20, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  title: { fontSize: 11, color: "#4b5563", marginBottom: 4 },
  contact: { fontSize: 9, color: "#4b5563", marginBottom: 14 },
  sectionHeading: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
    marginTop: 14,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 0.75,
    borderBottomColor: "#d1d5db",
  },
  summary: { marginBottom: 2 },
  roleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  roleTitle: { fontSize: 10.5, fontFamily: "Helvetica-Bold" },
  roleMeta: { fontSize: 9, color: "#4b5563" },
  company: { fontSize: 10, color: "#374151", marginBottom: 3 },
  bulletRow: { flexDirection: "row", marginBottom: 2.5, paddingRight: 4 },
  bulletGlyph: { width: 10 },
  bulletText: { flex: 1 },
  skillLine: { marginBottom: 2.5 },
  skillLabel: { fontFamily: "Helvetica-Bold" },
});

function contactLine(resume: OptimizedResume): string {
  return [
    resume.header.location,
    resume.header.email,
    resume.header.phone,
    ...resume.header.links,
  ]
    .filter((part) => part && part.trim().length > 0)
    .join("  ·  ");
}

function ResumeDocument({ resume }: { resume: OptimizedResume }) {
  return (
    <Document
      title={`${resume.header.name} — Resume`}
      author={resume.header.name}
    >
      <Page size="A4" style={styles.page}>
        {resume.header.name ? (
          <Text style={styles.name}>{resume.header.name}</Text>
        ) : null}
        {resume.header.title ? (
          <Text style={styles.title}>{resume.header.title}</Text>
        ) : null}
        <Text style={styles.contact}>{contactLine(resume)}</Text>

        {resume.summary ? (
          <>
            <Text style={styles.sectionHeading}>SUMMARY</Text>
            <Text style={styles.summary}>{resume.summary}</Text>
          </>
        ) : null}

        {resume.experience.length > 0 ? (
          <>
            <Text style={styles.sectionHeading}>EXPERIENCE</Text>
            {resume.experience.map((role, index) => (
              <View key={`${role.company}-${index}`} wrap={false}>
                <View style={styles.roleHeader}>
                  <Text style={styles.roleTitle}>{role.role}</Text>
                  <Text style={styles.roleMeta}>{role.dates}</Text>
                </View>
                <Text style={styles.company}>
                  {[role.company, role.location].filter(Boolean).join(", ")}
                </Text>
                {role.bullets.map((bullet, bulletIndex) => (
                  <View key={bulletIndex} style={styles.bulletRow}>
                    <Text style={styles.bulletGlyph}>•</Text>
                    <Text style={styles.bulletText}>{bullet.text}</Text>
                  </View>
                ))}
              </View>
            ))}
          </>
        ) : null}

        {resume.projects.length > 0 ? (
          <>
            <Text style={styles.sectionHeading}>PROJECTS</Text>
            {resume.projects.map((project, index) => (
              <View key={`${project.name}-${index}`} wrap={false}>
                <View style={styles.roleHeader}>
                  <Text style={styles.roleTitle}>{project.name}</Text>
                  <Text style={styles.roleMeta}>{project.dates}</Text>
                </View>
                {project.context ? (
                  <Text style={styles.company}>{project.context}</Text>
                ) : null}
                {project.bullets.map((bullet, bulletIndex) => (
                  <View key={bulletIndex} style={styles.bulletRow}>
                    <Text style={styles.bulletGlyph}>•</Text>
                    <Text style={styles.bulletText}>{bullet.text}</Text>
                  </View>
                ))}
              </View>
            ))}
          </>
        ) : null}

        {resume.skillGroups.length > 0 ? (
          <>
            <Text style={styles.sectionHeading}>SKILLS</Text>
            {resume.skillGroups.map((group) => (
              <Text key={group.label} style={styles.skillLine}>
                <Text style={styles.skillLabel}>{group.label}: </Text>
                {group.items.join(", ")}
              </Text>
            ))}
          </>
        ) : null}

        {resume.education.length > 0 ? (
          <>
            <Text style={styles.sectionHeading}>EDUCATION</Text>
            {resume.education.map((entry, index) => (
              <View key={`${entry.institution}-${index}`} wrap={false}>
                <View style={styles.roleHeader}>
                  <Text style={styles.roleTitle}>{entry.qualification}</Text>
                  <Text style={styles.roleMeta}>{entry.dates}</Text>
                </View>
                <Text style={styles.company}>{entry.institution}</Text>
                {entry.detail ? <Text>{entry.detail}</Text> : null}
              </View>
            ))}
          </>
        ) : null}
      </Page>
    </Document>
  );
}

export async function renderResumePdf(resume: OptimizedResume): Promise<Buffer> {
  return renderToBuffer(<ResumeDocument resume={resume} />);
}
