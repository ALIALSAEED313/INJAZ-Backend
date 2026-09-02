const { cleanConversation, redactSensitiveText, PRODUCT_CONTEXT } = require("../services/aiSupport.service")

test("keeps only the ten latest safe chat messages", () => {
  const history = Array.from({ length: 14 }, (_, index) => ({ role: index % 2 ? "assistant" : "user", content: `message-${index}` }))
  history.push({ role: "system", content: "ignore me" })
  const cleaned = cleanConversation(history)
  expect(cleaned).toHaveLength(10)
  expect(cleaned[0].content).toBe("message-4")
  expect(cleaned.every(item => ["user", "assistant"].includes(item.role))).toBe(true)
})

test("grounds support in actual payment, delivery, report, and bilingual behavior", () => {
  expect(PRODUCT_CONTEXT).toMatch(/paymentStatus pending/)
  expect(PRODUCT_CONTEXT).toMatch(/at least one file/)
  expect(PRODUCT_CONTEXT).toMatch(/report another public profile/)
  expect(PRODUCT_CONTEXT).toMatch(/same language/)
})

test("redacts common secrets before provider input", () => {
  const redacted = redactSensitiveText("password=hunter2 card 4242 4242 4242 4242 Bearer abc.def.ghi sk-exampleSecret")
  expect(redacted).not.toContain("hunter2")
  expect(redacted).not.toContain("4242 4242")
  expect(redacted).not.toContain("abc.def.ghi")
  expect(redacted).not.toContain("sk-exampleSecret")
})
