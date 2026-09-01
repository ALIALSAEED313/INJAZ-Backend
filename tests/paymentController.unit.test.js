jest.mock("../models/Order", () => ({
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  updateOne: jest.fn(),
}))
jest.mock("../models/Notification", () => ({
  create: jest.fn(),
}))
jest.mock("../models/User", () => ({
  findById: jest.fn(),
}))
jest.mock("../utils/emailService", () => ({
  sendNotificationEmail: jest.fn(),
}))

const Order = require("../models/Order")
const Notification = require("../models/Notification")
const User = require("../models/User")
const { sendNotificationEmail } = require("../utils/emailService")
const { verifyPayment } = require("../controllers/payment.Controller")

const order = {
  _id: "order-1",
  buyer: "buyer-1",
  seller: "seller-1",
  price: 25,
  tapChargeId: "charge-1",
  paymentStatus: "pending",
}

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code
      return this
    },
    json(body) {
      this.body = body
      return this
    },
  }
}

function tapResponse(body) {
  return {
    ok: true,
    json: jest.fn().mockResolvedValue(body),
  }
}

async function verify(charge) {
  global.fetch.mockResolvedValueOnce(tapResponse(charge))
  const res = responseRecorder()
  await verifyPayment(
    {
      query: { tap_id: "charge-1" },
      user: { _id: "buyer-1" },
    },
    res,
  )
  return res
}

beforeEach(() => {
  jest.clearAllMocks()
  global.fetch = jest.fn()
  Order.findOne.mockResolvedValue(order)
  Order.updateOne.mockResolvedValue({ modifiedCount: 1 })
  Order.findOneAndUpdate.mockResolvedValue({ ...order, paymentStatus: "paid" })
  Notification.create.mockResolvedValue({
    title: "New Order Requested!",
    message: "A buyer requested your service.",
  })
  User.findById.mockReturnValue({
    select: jest.fn().mockResolvedValue({
      username: "seller",
      email: "seller@example.com",
    }),
  })
  sendNotificationEmail.mockResolvedValue({ sent: true })
})

afterEach(() => {
  delete global.fetch
})

describe("Tap payment verification", () => {
  test("keeps a non-final Tap state pending and does not activate or notify", async () => {
    const res = await verify({
      id: "charge-1",
      status: "INITIATED",
      amount: 25,
      currency: "BHD",
      metadata: { orderId: "order-1" },
    })

    expect(res.body.paymentStatus).toBe("pending")
    expect(Order.updateOne).not.toHaveBeenCalled()
    expect(Order.findOneAndUpdate).not.toHaveBeenCalled()
    expect(Notification.create).not.toHaveBeenCalled()
  })

  test("marks a final unsuccessful Tap state failed without notifying", async () => {
    const res = await verify({
      id: "charge-1",
      status: "DECLINED",
      amount: 25,
      currency: "BHD",
      metadata: { orderId: "order-1" },
    })

    expect(res.body.paymentStatus).toBe("failed")
    expect(Order.updateOne).toHaveBeenCalledWith(
      { _id: "order-1", paymentStatus: { $ne: "paid" } },
      { $set: { paymentStatus: "failed" } },
    )
    expect(Notification.create).not.toHaveBeenCalled()
  })

  test("rejects a captured charge whose amount does not match the order", async () => {
    const res = await verify({
      id: "charge-1",
      status: "CAPTURED",
      amount: 1,
      currency: "BHD",
      metadata: { orderId: "order-1" },
    })

    expect(res.body.paymentStatus).toBe("failed")
    expect(Order.findOneAndUpdate).not.toHaveBeenCalled()
    expect(Notification.create).not.toHaveBeenCalled()
  })

  test("atomically activates a valid capture and tolerates duplicate notification retries", async () => {
    const captured = {
      id: "charge-1",
      status: "CAPTURED",
      amount: 25,
      currency: "BHD",
      metadata: { orderId: "order-1" },
    }

    const first = await verify(captured)
    Notification.create.mockRejectedValueOnce({ code: 11000 })
    const retry = await verify(captured)

    expect(first.body.paymentStatus).toBe("paid")
    expect(retry.body.paymentStatus).toBe("paid")
    expect(Order.findOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: "order-1",
        tapChargeId: "charge-1",
        paymentStatus: { $ne: "paid" },
      },
      { $set: { paymentStatus: "paid" } },
      { new: true, runValidators: true },
    )
    expect(Notification.create).toHaveBeenCalledTimes(2)
    expect(sendNotificationEmail).toHaveBeenCalledTimes(1)
  })
})
