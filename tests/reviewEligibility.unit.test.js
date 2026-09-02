jest.mock("../models/Review", () => ({
  findOne: jest.fn(),
  create: jest.fn(),
}))
jest.mock("../models/Order", () => ({
  findOne: jest.fn(),
}))
jest.mock("../models/Services", () => ({}))

const Review = require("../models/Review")
const Order = require("../models/Order")
const { createReview } = require("../controllers/review.controller")

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

const completedOrder = {
  _id: "order-1",
  buyer: { toString: () => "buyer-1" },
  seller: { toString: () => "seller-1" },
  service: "service-1",
  paymentStatus: "paid",
  status: "Completed",
}

beforeEach(() => {
  jest.clearAllMocks()
  Order.findOne.mockResolvedValue(completedOrder)
  Review.findOne.mockResolvedValue(null)
  Review.create.mockResolvedValue({ _id: "review-1", rating: 5 })
})

test("creates one review for the paid completed order buyer", async () => {
  const res = responseRecorder()
  await createReview({
    params: { orderId: "order-1" },
    user: { _id: "buyer-1" },
    body: { rating: 5, comment: "Excellent" },
  }, res)
  expect(res.statusCode).toBe(201)
  expect(Review.create).toHaveBeenCalledWith({
    service: "service-1",
    order: "order-1",
    reviewer: "buyer-1",
    comment: "Excellent",
    rating: 5,
  })
})

test("rejects reviews before the buyer completes the order", async () => {
  Order.findOne.mockResolvedValue({ ...completedOrder, status: "Delivered" })
  const res = responseRecorder()
  await createReview({
    params: { orderId: "order-1" },
    user: { _id: "buyer-1" },
    body: { rating: 5 },
  }, res)
  expect(res.statusCode).toBe(400)
  expect(Review.create).not.toHaveBeenCalled()
})

test("rejects seller reviews and duplicate order reviews", async () => {
  const sellerResponse = responseRecorder()
  await createReview({
    params: { orderId: "order-1" },
    user: { _id: "seller-1" },
    body: { rating: 5 },
  }, sellerResponse)
  expect(sellerResponse.statusCode).toBe(403)

  Review.findOne.mockResolvedValue({ _id: "existing-review" })
  const duplicateResponse = responseRecorder()
  await createReview({
    params: { orderId: "order-1" },
    user: { _id: "buyer-1" },
    body: { rating: 5 },
  }, duplicateResponse)
  expect(duplicateResponse.statusCode).toBe(409)
})
