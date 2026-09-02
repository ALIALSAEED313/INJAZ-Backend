jest.mock("../models/Order", () => ({
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
}))
jest.mock("../models/Notification", () => ({
  create: jest.fn(),
  findOne: jest.fn(),
}))
jest.mock("../models/User", () => ({
  findById: jest.fn(),
}))
jest.mock("../models/Services", () => ({}))
jest.mock("../utils/emailService", () => ({
  sendNotificationEmail: jest.fn(),
}))

const Order = require("../models/Order")
const Notification = require("../models/Notification")
const {
  acceptDelivery,
  authorizeDelivery,
  deliverOrder,
  requestRevision,
} = require("../controllers/ordersController")

const baseOrder = {
  _id: "order-1",
  buyer: { toString: () => "buyer-1" },
  seller: { toString: () => "seller-1" },
  paymentStatus: "paid",
  status: "In Progress",
  delivery: {},
  revision: {},
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

beforeEach(() => {
  jest.clearAllMocks()
  Notification.create.mockResolvedValue({ _id: "notification-1" })
})

describe("delivery authorization", () => {
  test("allows only the paid order seller in a valid state", async () => {
    Order.findOne.mockResolvedValue(baseOrder)
    const next = jest.fn()
    const req = {
      params: { orderId: "order-1" },
      user: { _id: "seller-1" },
    }
    await authorizeDelivery(req, responseRecorder(), next)
    expect(next).toHaveBeenCalledTimes(1)
    expect(req.order).toBe(baseOrder)
  })

  test("rejects an unpaid or failed order", async () => {
    Order.findOne.mockResolvedValue(null)
    const res = responseRecorder()
    await authorizeDelivery({
      params: { orderId: "order-1" },
      user: { _id: "seller-1" },
    }, res, jest.fn())
    expect(res.statusCode).toBe(404)
  })

  test("rejects the buyer or any wrong user", async () => {
    Order.findOne.mockResolvedValue(baseOrder)
    const res = responseRecorder()
    await authorizeDelivery({
      params: { orderId: "order-1" },
      user: { _id: "buyer-1" },
    }, res, jest.fn())
    expect(res.statusCode).toBe(403)
  })

  test("rejects an already delivered order before uploading files", async () => {
    Order.findOne.mockResolvedValue({
      ...baseOrder,
      status: "Delivered",
      delivery: { deliveredAt: new Date() },
    })
    const res = responseRecorder()
    await authorizeDelivery({
      params: { orderId: "order-1" },
      user: { _id: "seller-1" },
    }, res, jest.fn())
    expect(res.statusCode).toBe(409)
  })
})

describe("delivery state changes", () => {
  test("persists two uploaded files and notifies the buyer once", async () => {
    const deliveredOrder = {
      ...baseOrder,
      status: "Delivered",
      delivery: { deliveredAt: new Date() },
    }
    Order.findOneAndUpdate.mockResolvedValue(deliveredOrder)
    const req = {
      order: baseOrder,
      user: { _id: "seller-1" },
      body: { message: "Final files attached" },
      files: [
        {
          url: "https://files.example/final.zip",
          fileId: "file-1",
          originalname: "final.zip",
          mimetype: "application/zip",
          size: 1000,
        },
        {
          url: "https://files.example/design.pdf",
          fileId: "file-2",
          originalname: "design.pdf",
          mimetype: "application/pdf",
          size: 2000,
        },
      ],
    }
    const res = responseRecorder()
    await deliverOrder(req, res)

    expect(res.statusCode).toBe(200)
    expect(Order.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: "order-1",
        seller: "seller-1",
        paymentStatus: "paid",
      }),
      {
        $set: {
          status: "Delivered",
          delivery: expect.objectContaining({
            message: "Final files attached",
            files: [
              expect.objectContaining({ name: "final.zip" }),
              expect.objectContaining({ name: "design.pdf" }),
            ],
            deliveredAt: expect.any(Date),
          }),
        },
      },
      { new: true, runValidators: true },
    )
    expect(Notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        recipient: baseOrder.buyer,
        type: "DELIVERY_SUBMITTED",
      }),
    )
  })

  test("does not create a duplicate delivery when the atomic transition loses", async () => {
    Order.findOneAndUpdate.mockResolvedValue(null)
    const res = responseRecorder()
    await deliverOrder({
      order: baseOrder,
      user: { _id: "seller-1" },
      body: {},
      files: [{
        url: "https://files.example/final.zip",
        originalname: "final.zip",
        mimetype: "application/zip",
        size: 1000,
      }],
    }, res)
    expect(res.statusCode).toBe(409)
    expect(Notification.create).not.toHaveBeenCalled()
  })

  test("allows only the buyer to accept a delivered order", async () => {
    const delivered = {
      ...baseOrder,
      status: "Delivered",
      delivery: { deliveredAt: new Date() },
    }
    Order.findOne.mockResolvedValue(delivered)
    Order.findOneAndUpdate.mockResolvedValue({ ...delivered, status: "Completed" })

    const sellerResponse = responseRecorder()
    await acceptDelivery({
      params: { orderId: "order-1" },
      user: { _id: "seller-1" },
    }, sellerResponse)
    expect(sellerResponse.statusCode).toBe(403)

    const buyerResponse = responseRecorder()
    await acceptDelivery({
      params: { orderId: "order-1" },
      user: { _id: "buyer-1" },
    }, buyerResponse)
    expect(buyerResponse.statusCode).toBe(200)
    expect(Order.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ buyer: "buyer-1", status: "Delivered" }),
      { $set: { status: "Completed", completedAt: expect.any(Date) } },
      { new: true, runValidators: true },
    )
  })

  test("returns a delivered order to In Progress with the buyer revision note", async () => {
    const delivered = {
      ...baseOrder,
      status: "Delivered",
      delivery: { deliveredAt: new Date() },
    }
    Order.findOne.mockResolvedValue(delivered)
    Order.findOneAndUpdate.mockResolvedValue({ ...delivered, status: "In Progress" })
    const res = responseRecorder()
    await requestRevision({
      params: { orderId: "order-1" },
      user: { _id: "buyer-1" },
      body: { message: "Please update the source file." },
    }, res)

    expect(res.statusCode).toBe(200)
    expect(Order.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ buyer: "buyer-1", status: "Delivered" }),
      {
        $set: {
          status: "In Progress",
          revision: {
            message: "Please update the source file.",
            requestedAt: expect.any(Date),
          },
          startedAt: expect.any(Date),
        },
      },
      { new: true, runValidators: true },
    )
    expect(Notification.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: "REVISION_REQUESTED" }),
    )
  })
})
