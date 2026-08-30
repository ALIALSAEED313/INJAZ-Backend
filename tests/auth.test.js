require("dotenv").config({
  path: ".env.test",
});

jest.mock("../utils/emailService", () => ({
  sendNotificationEmail: jest.fn().mockResolvedValue({ sent: true }),
}));

const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../app");

const User = require("../models/User");
const { sendNotificationEmail } = require("../utils/emailService");

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
});

afterEach(async () => {
  await User.deleteMany({});
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("Auth Routes", () => {
  describe("POST /auth/sign-up", () => {
    test("creates a new user", async () => {
      const response = await request(app).post("/auth/sign-up").send({
        username: "zaid",
        email: "zaid@example.com",
        password: "password123",
      });

      expect(response.statusCode).toBe(201);

      expect(response.body.username).toBe("zaid");

      expect(response.body.hashedPassword).toBeUndefined();
    });

    test("does not allow duplicate usernames return 409", async () => {
      await User.create({
        username: "zaid",
        email: "zaid@example.com",
        hashedPassword: "hashedpassword",
      });

      const response = await request(app).post("/auth/sign-up").send({
        username: "zaid",
        email: "zaid@example.com",
        password: "password123",
      });

      expect(response.statusCode).toBe(409);

      expect(response.body.message).toBe("username already exists");
    });

    test("does not allow signup when missing username or password", async () => {
      const response = await request(app).post("/auth/sign-up").send({
        username: "zaid",
      });

      expect(response.statusCode).toBe(400);

      expect(response.body.message).toBeDefined();
    });
  });

  describe("POST /auth/sign-in", () => {
    beforeEach(async () => {
      jest.clearAllMocks();
      await User.create({
        username: "zaid",
        email: "zaid@example.com",
        hashedPassword: "$2b$12$LQv3c1y8f5k7H5x...",
      });
    });

    test("sends a welcome email after sign-up", async () => {
      await request(app).post("/auth/sign-up").send({
        username: "newuser",
        email: "newuser@example.com",
        password: "password123",
      });

      expect(sendNotificationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "newuser@example.com",
          subject: expect.stringMatching(/welcome|welcome to/i),
        }),
      );
    });

    test("sends a login alert email after sign-in", async () => {
      const hashed = await require("bcrypt").hash("password123", 12);
      await User.create({
        username: "loginuser",
        email: "loginuser@example.com",
        hashedPassword: hashed,
      });

      await request(app).post("/auth/sign-in").send({
        username: "loginuser",
        password: "password123",
      });

      expect(sendNotificationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "loginuser@example.com",
          subject: expect.stringMatching(/login|welcome back/i),
        }),
      );
    });

    test("requires username/email and password", async () => {
      const response = await request(app).post("/auth/sign-in").send({
        username: "zaid",
      });

      expect(response.statusCode).toBe(400);

      expect(response.body.message).toBe(
        "Username/email and password are required.",
      );
    });

    test("rejects invalid username", async () => {
      const response = await request(app).post("/auth/sign-in").send({
        username: "doesnotexist",
        password: "password123",
      });

      expect(response.statusCode).toBe(401);

      expect(response.body.message).toBe("Invalid credentials.");
    });

    test("rejects incorrect password", async () => {
      const response = await request(app).post("/auth/sign-in").send({
        username: "zaid",
        password: "wrongpassword",
      });

      expect(response.statusCode).toBe(401);

      expect(response.body.message).toBe("Invalid credentials.");
    });
  });
});
