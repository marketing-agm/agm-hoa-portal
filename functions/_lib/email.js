// Send via Resend (https://resend.com). RESEND_API_KEY + RESEND_FROM env vars.
export async function sendEmail(env, { to, subject, text, replyTo }) {
  if (!env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — skipping email", { to, subject });
    return { skipped: true };
  }
  const body = {
    from: env.RESEND_FROM || "AGM HOA Portal <portal@agmrealestategroup.com>",
    to: Array.isArray(to) ? to : [to],
    subject,
    text,
  };
  if (replyTo) body.reply_to = replyTo;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error("Resend error", res.status, errText);
    return { error: errText };
  }
  return res.json();
}
