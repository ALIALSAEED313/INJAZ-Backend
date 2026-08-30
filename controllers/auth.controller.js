const bcrypt = require("bcrypt");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { sendNotificationEmail } = require("../utils/emailService");

async function signUp(req, res) {
  try {
    const { username, password, email, isSeller } = req.body;

    // Validation
    if (!username || !password || !email)
      return res
        .status(400)
        .json({ message: "Username, email and password are required." });
    if (password.length < 6)
      return res
        .status(400)
        .json({ message: "Password must be more than 6 characters" });

    const user = await User.create({
      username,
      hashedPassword: await bcrypt.hash(password, 12),
      email,
      isSeller: Boolean(isSeller),
    });

    try {
      await sendNotificationEmail({
        to: user.email,
        subject: "Welcome to INJAZ",
        text: `Hi ${user.username}, welcome to INJAZ. Your account has been created successfully.`,
        html: `<p>Hi <strong>${user.username}</strong>,</p><p>Welcome to INJAZ. Your account has been created successfully.</p>`,
      });
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError.message);
    }

    const { _id, createdAt, updatedAt } = user;

    res.status(201).json({
      username: user.username,
      email: user.email,
      isSeller: user.isSeller,
      _id,
      createdAt,
      updatedAt,
    });
  } catch (err) {
    console.log(err);
    if (err.name === "ValidationError") {
      return res.status(400).json({
        message: err.message,
      });
    }
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return res.status(409).json({
        message: `${field} already exists`,
      });
    }

    console.log(err);
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
}

async function signIn(req, res) {
  try {
    const { username, email, password } = req.body;
    const loginValue = (username || email || "").trim();

    if (!loginValue || !password) {
      return res.status(400).json({
        message: "Username/email and password are required.",
      });
    }

    const user = await User.findOne({
      $or: [
        { username: loginValue.toLowerCase() },
        { email: loginValue.toLowerCase() },
      ],
    });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    if (user.isDeleted) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.hashedPassword,
    );
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // Construct the payload
    const payload = { username: user.username, _id: user._id };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    try {
      await sendNotificationEmail({
        to: user.email,
        subject: "INJAZ login alert",
        text: `Hi ${user.username}, you signed in successfully to INJAZ.`,
        html: `<p>Hi <strong>${user.username}</strong>,</p><p>You signed in successfully to INJAZ.</p>`,
      });
    } catch (emailError) {
      console.error("Failed to send login email:", emailError.message);
    }

    return res.status(200).json({
      accessToken,
      user: {
        _id: user._id,
        username: user.username,
        avatarUrl: user.avatarUrl,
        isSeller: user.isSeller,
      },
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
}

async function verifyUser(req, res) {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    return res.status(200).json({
      _id: user._id,
      username: user.username,
      isSeller: user.isSeller,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
}

module.exports = {
  signUp,
  signIn,
  verifyUser,
};
