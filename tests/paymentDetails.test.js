require("dotenv").config({ path: ".env.test" });

const request = require("supertest");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const app = require("../app");
const User = require("../models/User");
const PaymentDetails = require("../models/PaymentDetails");

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
});

afterEach(async () => {
  await PaymentDetails.deleteMany({});
  await User.deleteMany({});
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("Payment Details Routes", () => {
  test("creates payment details for a seller and masks the IBAN in the response", async () => {
    const user = await User.create({
      username: "sellerone",
      email: "sellerone@example.com",
      hashedPassword: "hashedpassword",
      isSeller: true,
    });

    const token = jwt.sign({ _id: user._id, username: user.username }, process.env.JWT_SECRET);

    const response = await request(app)
      .post("/payment-details")
      .set("Authorization", `Bearer ${token}`)
      .send({
        accountHolderName: "Ali Hassan",
        bankName: "Bank of Bahrain",
        iban: "BH29BDCC00001234567891",
        swiftCode: "BBAH BH 22",
        country: "Bahrain",
        currency: "BHD",
        paymentMethod: "Bank Transfer",
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.accountHolderName).toBe("Ali Hassan");
    expect(response.body.maskedIban).toMatch(/BH.*\d{4}/);
    expect(response.body.iban).toMatch(/BH.*\d{4}/);
    expect(response.body.iban).not.toContain("BH29BDCC00001234567891");
  });

  test("prevents duplicate payment details for the same user", async () => {
    const user = await User.create({
      username: "sellertwo",
      email: "sellertwo@example.com",
      hashedPassword: "hashedpassword",
      isSeller: true,
    });

    const token = jwt.sign({ _id: user._id, username: user.username }, process.env.JWT_SECRET);

    await request(app)
      .post("/payment-details")
      .set("Authorization", `Bearer ${token}`)
      .send({
        accountHolderName: "Ali Hassan",
        bankName: "Bank of Bahrain",
        iban: "BH29BDCC00001234567891",
        country: "Bahrain",
        currency: "BHD",
        paymentMethod: "Bank Transfer",
      });

    const duplicateResponse = await request(app)
      .post("/payment-details")
      .set("Authorization", `Bearer ${token}`)
      .send({
        accountHolderName: "Ali Hassan",
        bankName: "Bank of Bahrain",
        iban: "BH29BDCC00001234567892",
        country: "Bahrain",
        currency: "BHD",
        paymentMethod: "Bank Transfer",
      });

    expect(duplicateResponse.statusCode).toBe(409);
    expect(duplicateResponse.body.message).toMatch(/already/i);
  });
});
