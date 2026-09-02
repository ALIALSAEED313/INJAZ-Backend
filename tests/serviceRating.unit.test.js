jest.mock("../models/Services", () => ({
  findById: jest.fn(),
}))
jest.mock("../models/Search", () => ({}))
jest.mock("../models/Review", () => ({
  aggregate: jest.fn(),
}))

const Service = require("../models/Services")
const Review = require("../models/Review")
const { getServiceById } = require("../controllers/service.controller")

const serviceDocument = {
  _id: { toString: () => "service-1" },
  toObject: () => ({ _id: "service-1", title: "Real service" }),
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
  Service.findById.mockReturnValue({
    populate: jest.fn().mockResolvedValue(serviceDocument),
  })
})

test("exposes the real average and review count from Review aggregation", async () => {
  Review.aggregate.mockResolvedValue([{
    _id: { toString: () => "service-1" },
    averageRating: 4.5,
    reviewCount: 2,
  }])
  const res = responseRecorder()
  await getServiceById({ params: { id: "service-1" } }, res)
  expect(res.body).toEqual(expect.objectContaining({
    averageRating: 4.5,
    reviewCount: 2,
  }))
})

test("returns a clean zero-review state instead of a fake rating", async () => {
  Review.aggregate.mockResolvedValue([])
  const res = responseRecorder()
  await getServiceById({ params: { id: "service-1" } }, res)
  expect(res.body).toEqual(expect.objectContaining({
    averageRating: 0,
    reviewCount: 0,
  }))
})

test("recomputes rating on every request so review edits and deletes are reflected", async () => {
  Review.aggregate
    .mockResolvedValueOnce([{
      _id: { toString: () => "service-1" },
      averageRating: 5,
      reviewCount: 1,
    }])
    .mockResolvedValueOnce([])

  const beforeDelete = responseRecorder()
  await getServiceById({ params: { id: "service-1" } }, beforeDelete)
  const afterDelete = responseRecorder()
  await getServiceById({ params: { id: "service-1" } }, afterDelete)

  expect(beforeDelete.body.averageRating).toBe(5)
  expect(afterDelete.body.averageRating).toBe(0)
  expect(Review.aggregate).toHaveBeenCalledTimes(2)
})
