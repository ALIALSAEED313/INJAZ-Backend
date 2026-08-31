require("dotenv").config({
  path: ".env.test",
});

jest.mock("../utils/emailService", () => ({
  sendNotificationEmail: jest.fn().mockResolvedValue({ sent: true }),
}));

const request = require("supertest");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
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
  describe("PUT /profile", () => {
    test("ignores blank gender values and keeps booleans valid", async () => {
      const user = await User.create({
        username: "profileuser",
        email: "profileuser@example.com",
        hashedPassword: "hashedpassword",
        name: "Old Name",
        bio: "Old bio",
        country: "Jordan",
        gender: "male",
        languages: ["English"],
        skills: ["React"],
        isSeller: false,
      });

      const token = jwt.sign(
        { _id: user._id, username: user.username },
        process.env.JWT_SECRET,
      );

      const response = await request(app)
        .put("/profile")
        .set("Authorization", `Bearer ${token}`)
        .field("name", "New Name")
        .field("bio", "Updated bio")
        .field("country", "UAE")
        .field("gender", "")
        .field("languages", JSON.stringify(["English", "Arabic"]))
        .field("skills", JSON.stringify(["React", "Node"]))
        .field("isSeller", "false");

      expect(response.statusCode).toBe(200);
      expect(response.body.name).toBe("New Name");
      expect(response.body.bio).toBe("Updated bio");
      expect(response.body.country).toBe("UAE");
      expect(response.body.gender).toBe("male");
      expect(response.body.isSeller).toBe(false);
    });
  });

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
