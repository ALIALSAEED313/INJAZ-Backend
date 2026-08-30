const nodemailer = require("nodemailer");

function buildTransport() {
  const login = process.env.BREVO_LOGIN;
  const key = process.env.BREVO_SMTP_KEY;

  if (!login || !key) {
    return null;
  }

  return nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false,
    auth: {
      user: login,
      pass: key,
    },
  });
}

async function sendNotificationEmail({ to, subject, text, html }) {
  const transporter = buildTransport();

  if (!transporter) {
    return { sent: false, reason: "SMTP_NOT_CONFIGURED" };
  }

  const info = await transporter.sendMail({
    from: process.env.BREVO_LOGIN,
    to,
    subject,
    text,
    html,
  });

  return {
    sent: true,
    messageId: info.messageId,
  };
}

module.exports = {
  sendNotificationEmail,
};
