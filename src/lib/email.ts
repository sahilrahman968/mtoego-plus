import nodemailer from "nodemailer";
import { env } from "@/lib/env";

let _transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  }
  return _transporter;
}

export async function sendVerificationEmail(
  to: string,
  name: string,
  token: string
) {
  const verifyUrl = `${env.APP_URL}/verify-email?token=${token}`;

  await getTransporter().sendMail({
    from: env.SMTP_FROM,
    to,
    subject: "Verify your email — Motoego+",
    html: `
      <div style="max-width:480px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a">
        <div style="padding:32px 24px;text-align:center">
          <div style="width:48px;height:48px;background:#1a1a1a;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:24px">
            <span style="color:#fff;font-weight:700;font-size:20px">S</span>
          </div>
          <h1 style="font-size:22px;margin:0 0 8px">Verify your email</h1>
          <p style="color:#666;font-size:14px;margin:0 0 28px">
            Hi ${name}, thanks for signing up! Please confirm your email address to get started.
          </p>
          <a href="${verifyUrl}"
             style="display:inline-block;padding:12px 32px;background:#1a1a1a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">
            Verify Email
          </a>
          <p style="color:#999;font-size:12px;margin:28px 0 0">
            This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
          </p>
        </div>
      </div>
    `,
  });
}

interface CallbackRequestEmailInput {
  requirement: string;
  phone: string;
  contactHours: string;
  sourceUrl?: string;
}

export async function sendCallbackRequestEmail(
  to: string,
  payload: CallbackRequestEmailInput
) {
  const submittedAt = new Date().toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });

  await getTransporter().sendMail({
    from: env.SMTP_FROM,
    to,
    subject: "New callback request — Motoego+",
    html: `
      <div style="max-width:560px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#151515">
        <div style="padding:28px 24px;border:1px solid #ececec;border-radius:12px;background:#fff">
          <h1 style="font-size:20px;margin:0 0 12px;color:#111">New callback request</h1>
          <p style="font-size:14px;color:#555;margin:0 0 16px">
            A customer has requested a callback from the landing page popup.
          </p>
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <tr>
              <td style="padding:10px 0;border-top:1px solid #f0f0f0;color:#666;width:180px">Phone Number</td>
              <td style="padding:10px 0;border-top:1px solid #f0f0f0;color:#111;font-weight:600">${payload.phone}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;border-top:1px solid #f0f0f0;color:#666">Preferred Hours</td>
              <td style="padding:10px 0;border-top:1px solid #f0f0f0;color:#111">${payload.contactHours}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;border-top:1px solid #f0f0f0;color:#666">Submitted At</td>
              <td style="padding:10px 0;border-top:1px solid #f0f0f0;color:#111">${submittedAt}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;border-top:1px solid #f0f0f0;color:#666">Source</td>
              <td style="padding:10px 0;border-top:1px solid #f0f0f0;color:#111">${payload.sourceUrl ?? "Landing page popup"}</td>
            </tr>
          </table>
          <div style="margin-top:16px;padding:14px;border-radius:8px;background:#fafafa;border:1px solid #efefef">
            <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#555">
              Requirement
            </p>
            <p style="margin:0;font-size:14px;line-height:1.6;color:#222;white-space:pre-wrap">${payload.requirement}</p>
          </div>
        </div>
      </div>
    `,
  });
}
