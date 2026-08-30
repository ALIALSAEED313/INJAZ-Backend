const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      secure: false, 
      auth: {
        user: process.env.BREVO_LOGIN,
        pass: process.env.BREVO_SMTP_KEY,
      },
    });

    const mailOptions = {
      from: `"Injaz Platform" <${process.env.BREVO_LOGIN}>`, 
      to: options.email,
      subject: options.subject,
      html: options.message,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully! Message ID:", info.messageId);
  } catch (error) {
    console.error("Email failed to send:", error);
  }
};

module.exports = sendEmail;