const User = require("../models/User")

async function isAdmin(req, res, next) {
  try {
    const user = await User.findById(req.user._id)

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      })
    }

    if (user.role !== "admin" || user.isDeleted) { 
      return res.status(403).json({
        message: "Admin access required"
      })
    }

    next()
  } catch (err) {
    console.error(err)

    return res.status(500).json({
      message: "Internal Server Error"
    })
  }
}

module.exports = isAdmin