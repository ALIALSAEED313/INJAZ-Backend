const bcrypt = require("bcrypt");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const crypto = require("crypto")
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
        email: user.email,
        avatarUrl: user.avatarUrl,
        isSeller: user.isSeller,
        role: user.role,
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
      email: user.email,
      isSeller: user.isSeller,
      avatarUrl: user.avatarUrl,
      role: user.role,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
}
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({ message: "User with this email does not exist." });
    }

    // 1. Generate a secure random token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // 2. Set token and expiration (e.g., 1 hour from now) on the user
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour in milliseconds
    await user.save();

    // 3. Create the reset link (Change the port if your React app doesn't run on 5173)
    const resetUrl = `http://localhost:5173/reset-password/${resetToken}`;

    // 4. Send the email
    await sendNotificationEmail({
      to: user.email,
      subject: "Password Reset Request - INJAZ",
      text: `You requested a password reset. Click here to reset: ${resetUrl}`,
      html: `
        <h3>Password Reset Request</h3>
        <p>You requested to reset your INJAZ password.</p>
        <p>Please click the link below to set a new password. This link is valid for 1 hour.</p>
        <a href="${resetUrl}" style="display:inline-block; padding:10px 20px; background-color:#1ba84c; color:white; text-decoration:none; border-radius:4px;">Reset Password</a>
        <p>If you did not request this, please ignore this email.</p>
      `,
    });

    res.status(200).json({ message: "Password reset link sent to your email." });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ message: "Error sending password reset email." });
  }
}

async function resetPassword(req, res) {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    // 1. Find user by token AND ensure the token hasn't expired
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }, // $gt means "greater than" current time
    });

    if (!user) {
      return res.status(400).json({ message: "Password reset token is invalid or has expired." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be more than 6 characters." });
    }

    // 2. Hash the new password
    user.hashedPassword = await bcrypt.hash(newPassword, 12);

    // 3. Clear the reset token fields so they can't be used again
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // 4. Send a success confirmation email
    await sendNotificationEmail({
      to: user.email,
      subject: "Password Reset Successful - INJAZ",
      text: "Your password has been successfully reset.",
      html: `<p>Hi <strong>${user.username}</strong>,</p><p>Your INJAZ account password has been successfully updated. If you did not make this change, please contact support immediately.</p>`,
    });

    res.status(200).json({ message: "Password has been successfully reset." });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Error resetting password." });
  }
}

module.exports = {
  signUp,
  signIn,
  verifyUser,
  forgotPassword,
  resetPassword
};
