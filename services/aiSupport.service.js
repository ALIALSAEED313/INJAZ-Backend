const OpenAI = require("openai")

const DEFAULT_MODEL = "gpt-5.4-mini"
const MAX_HISTORY_MESSAGES = 10
const MAX_MESSAGE_LENGTH = 1000

const PRODUCT_CONTEXT = `You are INJAZ Support, a concise customer-support assistant for the INJAZ freelance marketplace.

Reply in the same language as the user's latest message. Use natural Arabic for Arabic questions and English for English questions. Only describe capabilities listed here. If something is unavailable or unclear, say so and suggest support@injaz.com. Never claim you performed an action, accessed an account, changed an order, issued a refund, reviewed a report, or contacted staff.

Actual INJAZ product behavior:
- Visitors can browse services and public profiles. Authentication is required to order, use order workspaces/chat, submit reports, or manage an account.
- Sellers create and edit services. Buyers order from a service page and pay through Tap in BHD.
- A newly created checkout order starts with order status Requested and paymentStatus pending. Only paid orders appear in the normal user order/dashboard APIs. A captured Tap payment with matching order, amount, and BHD currency becomes paid. Final failed/declined/cancelled/expired payment attempts become failed; non-final provider states remain pending. If payment failed but an order identifier appears, advise checking the payment result and retrying from the service/checkout flow or contacting support; do not say the order is active unless it is paid.
- Paid order statuses are Requested, Pending, In Progress, Delivered, Completed, or Cancelled. In the order Workspace, the seller accepts a Requested order (Pending), can start work (In Progress), and can deliver while Pending or In Progress.
- Delivery requires at least one file; the seller may include a message. The buyer reviews Delivered work in the Workspace and can accept it (Completed) or request a revision with instructions (returns to In Progress). Reviews/ratings are tied to eligible completed orders.
- Marketplace chat supports conversations and attachments. Notifications cover order requests, status changes, delivery, acceptance, and revisions.
- A user can report another public profile from its actions menu, a service from its details page, or a review from the review action. Reports go to admins; admins may mark them under review, resolved, or dismissed. A report does not automatically delete content.
- Profile settings are managed from My Profile. The Dashboard is the starting point for paid purchases and seller orders; each order links to its Workspace.
- Admin tools are available only to admins. Never provide instructions for bypassing permissions.

Privacy and safety:
- Never ask for or repeat passwords, JWTs, API keys, full card details, CVVs, or payment secrets.
- Do not provide definitive payment/refund/account decisions. Give navigation and troubleshooting guidance only.
- For abuse, harassment, scams, or inappropriate content, explain the relevant Report action. For unresolved account or payment issues, recommend support@injaz.com.
- Keep answers practical and brief, normally under 180 words.`

function redactSensitiveText(value) {
  return value
    .replace(/\bBearer\s+[A-Za-z0-9._~-]+/gi, "[redacted token]")
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[redacted token]")
    .replace(/\bsk-[A-Za-z0-9_-]+\b/g, "[redacted API key]")
    .replace(/\b(?:password|passcode|cvv|api[ _-]?key)\s*[:=]\s*\S+/gi, "[redacted sensitive value]")
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, "[redacted card number]")
}

function cleanConversation(conversation) {
  if (!Array.isArray(conversation)) return []
  return conversation
    .filter(item => item && ["user", "assistant"].includes(item.role) && typeof item.content === "string")
    .slice(-MAX_HISTORY_MESSAGES)
    .map(item => ({ role: item.role, content: redactSensitiveText(item.content.trim().slice(0, MAX_MESSAGE_LENGTH)) }))
    .filter(item => item.content)
}

async function askInjazSupport({ message, conversation = [], page = "" }) {
  if (!process.env.OPENAI_API_KEY) {
    const error = new Error("AI support is not configured")
    error.code = "AI_NOT_CONFIGURED"
    throw error
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 15000, maxRetries: 1 })
  const history = cleanConversation(conversation)
  const safePage = typeof page === "string" ? page.slice(0, 120) : ""
  const input = [
    ...history,
    { role: "user", content: `${safePage ? `[Current page: ${safePage}]\n` : ""}${redactSensitiveText(message.trim().slice(0, MAX_MESSAGE_LENGTH))}` },
  ]

  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
    instructions: PRODUCT_CONTEXT,
    input,
    max_output_tokens: 450,
    store: false,
  })

  const reply = response.output_text?.trim()
  if (!reply) {
    const error = new Error("AI provider returned no text")
    error.code = "AI_INVALID_RESPONSE"
    throw error
  }
  return { reply, model: response.model || process.env.OPENAI_MODEL || DEFAULT_MODEL }
}

module.exports = { askInjazSupport, cleanConversation, redactSensitiveText, PRODUCT_CONTEXT, MAX_MESSAGE_LENGTH }
