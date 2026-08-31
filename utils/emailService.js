const nodemailer = require("nodemailer");

async function sendNotificationEmail({ to, subject, text, html }) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"INJAZ Platform" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    });

    console.log("Email sent via Gmail! Message ID:", info.messageId);
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error("Gmail error:", error);
    return { sent: false, reason: error.message };
  }
}

module.exports = {
  sendNotificationEmail,
};