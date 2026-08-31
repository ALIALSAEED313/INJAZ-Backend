const User = require("../models/User");

function normalizeListValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value !== "string") {
    return [];
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch (err) {
    // ignore invalid JSON and fall back to comma splitting below
  }

  return trimmed
    .replace(/^\[|\]$/g, "")
    .split(",")
    .map((item) => item.replace(/["'\[\]]/g, "").trim())
    .filter(Boolean);
}

// Get public profile
async function getProfile(req, res) {
  try {
    const foundUser = await User.findById(req.params.userId).select(
      "username name avatarUrl bio country gender languages skills isSeller createdAt",
    );

    if (!foundUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const formattedUser = {
      ...foundUser.toObject(),
      languages: normalizeListValue(foundUser.languages),
      skills: normalizeListValue(foundUser.skills),
    };

    return res.status(200).json(formattedUser);
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
}

// Get logged-in user's profile
async function getMyProfile(req, res) {
  try {
    const foundUser = await User.findById(req.user._id).select(
      "username email name avatarUrl bio country gender languages skills isSeller createdAt",
    );

    if (!foundUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const formattedUser = {
      ...foundUser.toObject(),
      languages: normalizeListValue(foundUser.languages),
      skills: normalizeListValue(foundUser.skills),
    };

    return res.status(200).json(formattedUser);
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
}

// Update logged-in user's
async function updateProfile(req, res) {
  try {
    const { name, bio, country, gender, languages, skills, isSeller } =
      req.body;

    const updateData = {};

    if (name !== undefined) updateData.name = name;
    if (bio !== undefined) updateData.bio = bio;
    if (country !== undefined) updateData.country = country;
    if (gender !== undefined && String(gender).trim() !== "") {
      updateData.gender = String(gender).trim().toLowerCase();
    }
    if (languages !== undefined)
      updateData.languages = normalizeListValue(languages);
    if (skills !== undefined) updateData.skills = normalizeListValue(skills);
    if (isSeller !== undefined) {
      const sellerValue = String(isSeller).trim().toLowerCase();
      updateData.isSeller = sellerValue === "true";
    }

    if (req.file && req.file.url) {
      updateData.avatarUrl = req.file.url;
    }

    const updatedUser = await User.findByIdAndUpdate(req.user._id, updateData, {
      new: true,
      runValidators: true,
    }).select(
      "username email name avatarUrl bio country gender languages skills isSeller createdAt",
    );

    if (!updatedUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const formattedUser = {
      ...updatedUser.toObject(),
      languages: normalizeListValue(updatedUser.languages),
      skills: normalizeListValue(updatedUser.skills),
    };

    return res.status(200).json(formattedUser);
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
}

async function deleteProfile(req, res) {
  try {
    const deletedProfile = await User.findByIdAndUpdate(
      req.user._id,
      {
        isDeleted: true,
      },
      {
        new: true,
      },
    );

    if (!deletedProfile) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ message: "Profile deleted successfully" });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
}

module.exports = {
  getProfile,
  getMyProfile,
  updateProfile,
  deleteProfile,
};
