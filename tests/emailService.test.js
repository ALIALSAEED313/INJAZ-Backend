jest.mock("nodemailer", () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: "123" }),
  })),
}));

const { sendNotificationEmail } = require("../utils/emailService");

describe("emailService", () => {
  beforeEach(() => {
    process.env.BREVO_LOGIN = "test@brevo.com";
    process.env.BREVO_SMTP_KEY = "test-key";
  });

  test("sends a notification email when SMTP credentials are configured", async () => {
    const result = await sendNotificationEmail({
      to: "buyer@example.com",
      subject: "New order request",
      text: "You have a new order request.",
      html: "<p>You have a new order request.</p>",
    });

    expect(result.sent).toBe(true);
    expect(result.messageId).toBe("123");
  });
});
