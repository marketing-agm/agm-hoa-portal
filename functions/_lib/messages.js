// Server-side mirror of src/shared/messages.js — kept identical for parity in
// emailed bodies. If you change one, change the other.

export function generateMaintenanceMessage({
  categoryLabel,
  location,
  durationLabel,
  urgencyLabel,
  details,
}) {
  const lines = [];
  if (categoryLabel) lines.push(`Maintenance request — ${categoryLabel}`);
  if (location?.trim()) lines.push(`Location: ${location.trim()}`);
  if (durationLabel) lines.push(`Started: ${durationLabel}`);
  if (urgencyLabel) lines.push(`Urgency: ${urgencyLabel}`);
  if (details?.trim()) {
    if (lines.length > 0) lines.push("");
    lines.push(details.trim());
  }
  return lines.join("\n");
}

export function generateArchitecturalMessage({
  projectTypeLabel,
  projectName,
  unitLocation,
  materials,
  contractorLabel,
  startDate,
  durationLabel,
  notes,
}) {
  const lines = [];
  if (projectTypeLabel) lines.push(`ARC request — ${projectTypeLabel}`);
  if (projectName?.trim()) lines.push(`Project: ${projectName.trim()}`);
  if (unitLocation?.trim()) lines.push(`Location: ${unitLocation.trim()}`);
  if (startDate?.trim()) lines.push(`Estimated start: ${startDate.trim()}`);
  if (durationLabel) lines.push(`Duration: ${durationLabel}`);
  if (contractorLabel) lines.push(`Work performed by: ${contractorLabel}`);
  if (materials?.trim()) {
    if (lines.length > 0) lines.push("");
    lines.push(`Materials: ${materials.trim()}`);
  }
  if (notes?.trim()) {
    lines.push("");
    lines.push(`Notes: ${notes.trim()}`);
  }
  return lines.join("\n");
}

export function generateContactEmail({
  hoaName,
  categoryLabel,
  subjectInput,
  unit,
  message,
  replyPrefLabel,
  phone,
}) {
  let subject = "";
  const trimmedSubject = subjectInput?.trim() || "";
  const tag = `[${hoaName || "HOA"}]`;
  if (categoryLabel && trimmedSubject) {
    subject = `${tag} ${categoryLabel} — ${trimmedSubject}`;
  } else if (categoryLabel) {
    subject = `${tag} ${categoryLabel}`;
  } else if (trimmedSubject) {
    subject = `${tag} ${trimmedSubject}`;
  }

  const bodyParts = [];
  if (message?.trim()) bodyParts.push(message.trim());

  const footerLines = [];
  if (unit?.trim()) footerLines.push(`Unit ${unit.trim()}`);
  if (replyPrefLabel) footerLines.push(`Reply by ${replyPrefLabel.toLowerCase()}`);
  if (phone?.trim()) footerLines.push(`Phone: ${phone.trim()}`);

  if (footerLines.length > 0) {
    footerLines.push(`Sent via the ${hoaName || "HOA"} resident portal`);
    if (bodyParts.length > 0) {
      bodyParts.push("");
      bodyParts.push("—");
    }
    bodyParts.push(...footerLines);
  }

  return { subject, body: bodyParts.join("\n") };
}
