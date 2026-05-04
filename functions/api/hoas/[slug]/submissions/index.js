import { requireAdmin } from "../../../../_lib/auth.js";
import { json, badRequest, unauthorized, notFound, uuid } from "../../../../_lib/http.js";
import { getHoaBySlug } from "../../../../_lib/db.js";
import { sendEmail } from "../../../../_lib/email.js";
import {
  generateMaintenanceMessage,
  generateArchitecturalMessage,
  generateContactEmail,
} from "../../../../_lib/messages.js";

export async function onRequestGet({ params, request, env }) {
  if (!(await requireAdmin(request, env))) return unauthorized();
  const slug = params.slug;
  const res = await env.DB.prepare(
    "SELECT * FROM submissions WHERE hoa_id = ? ORDER BY created_at DESC LIMIT 200"
  )
    .bind(slug)
    .all();
  return json({ submissions: res.results || [] });
}

export async function onRequestPost({ params, request, env }) {
  const slug = params.slug;
  const hoa = await getHoaBySlug(env, slug);
  if (!hoa) return notFound();

  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON");
  }

  const { form_type, payload, submitter } = body || {};
  if (!form_type || !payload) return badRequest("form_type and payload required");
  if (!["maintenance", "architectural", "contact"].includes(form_type)) {
    return badRequest("invalid form_type");
  }

  let subject = "";
  let messageBody = "";
  let recipient = hoa.manager_email;
  let preview = "";

  if (form_type === "maintenance") {
    messageBody = generateMaintenanceMessage(payload);
    subject = `[${hoa.name}] Maintenance request${
      payload.categoryLabel ? ` — ${payload.categoryLabel}` : ""
    }`;
    preview = (payload.details || payload.categoryLabel || "").slice(0, 200);
  } else if (form_type === "architectural") {
    messageBody = generateArchitecturalMessage(payload);
    subject = `[${hoa.name}] Architectural request${
      payload.projectTypeLabel ? ` — ${payload.projectTypeLabel}` : ""
    }`;
    preview = (payload.notes || payload.projectName || payload.projectTypeLabel || "").slice(0, 200);
  } else {
    const email = generateContactEmail({ hoaName: hoa.name, ...payload });
    subject = email.subject;
    messageBody = email.body;
    preview = (payload.message || payload.subjectInput || "").slice(0, 200);
    if (payload.recipient === "board" && hoa.board_email) {
      recipient = hoa.board_email;
    }
  }

  const id = uuid();
  await env.DB.prepare(
    `INSERT INTO submissions (
       id, hoa_id, form_type, payload_json, message_preview,
       submitter_name, submitter_email, submitter_unit
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      slug,
      form_type,
      JSON.stringify(payload),
      preview,
      submitter?.name || null,
      submitter?.email || null,
      submitter?.unit || null
    )
    .run();

  // Fire email; don't block response on failure.
  try {
    await sendEmail(env, {
      to: recipient,
      subject: subject || `[${hoa.name}] New ${form_type} submission`,
      text: messageBody || JSON.stringify(payload, null, 2),
      replyTo: submitter?.email || undefined,
    });
  } catch (err) {
    console.error("Email failure", err);
  }

  return json({ ok: true, id }, { status: 201 });
}
