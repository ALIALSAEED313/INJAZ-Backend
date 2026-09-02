const mockCreate = jest.fn()

jest.mock("openai", () => jest.fn().mockImplementation(() => ({
  responses: { create: mockCreate },
})))

const { askInjazSupport } = require("../services/aiSupport.service")

afterEach(() => {
  delete process.env.OPENAI_API_KEY
  delete process.env.OPENAI_MODEL
  jest.clearAllMocks()
})

test("calls the OpenAI Responses API with bounded, non-persistent context", async () => {
  process.env.OPENAI_API_KEY = "test-server-key"
  process.env.OPENAI_MODEL = "test-model"
  mockCreate.mockResolvedValue({ output_text: "Open the Workspace to deliver the files.", model: "test-model" })

  const result = await askInjazSupport({
    message: "How do I deliver work?",
    conversation: [{ role: "user", content: "I am a seller" }],
    page: "/workspace/example",
  })

  expect(result.reply).toMatch(/Workspace/)
  expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
    model: "test-model",
    store: false,
    input: expect.arrayContaining([expect.objectContaining({ role: "user" })]),
  }))
})
