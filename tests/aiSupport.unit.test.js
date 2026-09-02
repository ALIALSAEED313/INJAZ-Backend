jest.mock("../services/aiSupport.service", () => ({
  askInjazSupport: jest.fn(),
  MAX_MESSAGE_LENGTH: 1000,
}))

const { askInjazSupport } = require("../services/aiSupport.service")
const { askAi } = require("../controllers/support.controller")

const response = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this },
  json(body) { this.body = body; return this },
})

beforeEach(() => jest.clearAllMocks())

test("returns a real provider reply", async () => {
  askInjazSupport.mockResolvedValue({ reply: "Open the paid order Workspace and attach at least one delivery file.", model: "test-model" })
  const res = response()
  await askAi({ body: { message: "How do I deliver work?", conversation: [], page: "/workspace/123" } }, res)
  expect(res.statusCode).toBe(200)
  expect(res.body.reply).toMatch(/Workspace/)
  expect(askInjazSupport).toHaveBeenCalledWith(expect.objectContaining({ message: "How do I deliver work?" }))
})

test("rejects empty questions", async () => {
  const res = response()
  await askAi({ body: { message: "   " } }, res)
  expect(res.statusCode).toBe(400)
  expect(askInjazSupport).not.toHaveBeenCalled()
})

test("returns a safe fallback when OpenAI is unavailable", async () => {
  askInjazSupport.mockRejectedValue(Object.assign(new Error("missing key"), { code: "AI_NOT_CONFIGURED" }))
  const res = response()
  await askAi({ body: { message: "شلون أسلم الشغل للمشتري؟" } }, res)
  expect(res.statusCode).toBe(503)
  expect(res.body.message).toContain("support@injaz.com")
  expect(res.body).not.toHaveProperty("error")
})
