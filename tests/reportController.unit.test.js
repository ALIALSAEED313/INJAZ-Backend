jest.mock("../models/Report", () => ({ findOne: jest.fn(), create: jest.fn() }))
jest.mock("../models/User", () => ({ findById: jest.fn() }))
jest.mock("../models/Services", () => ({ findById: jest.fn() }))
jest.mock("../models/Review", () => ({ findById: jest.fn() }))

const Report = require("../models/Report")
const User = require("../models/User")
const { createReport } = require("../controllers/report.controller")

const response = () => ({ statusCode: 200, body: null, status(code) { this.statusCode = code; return this }, json(body) { this.body = body; return this } })
const selectable = value => ({ select: jest.fn().mockResolvedValue(value) })

beforeEach(() => {
  jest.clearAllMocks()
  User.findById.mockReturnValue(selectable({ _id: "507f1f77bcf86cd799439011" }))
  Report.findOne.mockResolvedValue(null)
  Report.create.mockResolvedValue({ _id: "report-1" })
})

test("creates a validated user report", async () => {
  const res = response()
  await createReport({ user: { _id: "507f191e810c19729de860ea" }, body: { targetType: "USER", targetId: "507f1f77bcf86cd799439011", reason: "SPAM", details: "Repeated offers" } }, res)
  expect(res.statusCode).toBe(201)
  expect(Report.create).toHaveBeenCalledWith(expect.objectContaining({ targetType: "USER", reason: "SPAM" }))
})

test("rejects malformed targets and recent duplicate reports", async () => {
  const malformed = response()
  await createReport({ user: { _id: "507f191e810c19729de860ea" }, body: { targetType: "USER", targetId: "bad", reason: "SPAM" } }, malformed)
  expect(malformed.statusCode).toBe(400)

  Report.findOne.mockResolvedValue({ _id: "existing" })
  const duplicate = response()
  await createReport({ user: { _id: "507f191e810c19729de860ea" }, body: { targetType: "USER", targetId: "507f1f77bcf86cd799439011", reason: "SPAM" } }, duplicate)
  expect(duplicate.statusCode).toBe(409)
})
