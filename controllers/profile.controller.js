const User = require("../models/User");

// Get public profile
async function getProfile(req, res) {
    try {
        const foundUser = await User.findById(req.params.userId)
            .select("username name avatarUrl bio country languages skills isSeller createdAt")

        if (!foundUser) {
            return res.status(404).json({ message: "User not found", })
        }

        return res.status(200).json(foundUser)
    } catch (err) {
        console.error(err)

        return res.status(500).json({
            message: "Internal Server Error",
        })
    }
}

// Get logged-in user's profile
async function getMyProfile(req, res) {
    try {
        const foundUser = await User.findById(req.user._id)
            .select("username email name avatarUrl bio country languages skills isSeller createdAt")

        if (!foundUser) {
            return res.status(404).json({ message: "User not found", })
        }

        return res.status(200).json(foundUser)
    } catch (err) {
        console.error(err)

        return res.status(500).json({
            message: "Internal Server Error",
        })
    }
}

// Update logged-in user's profile
async function updateProfile(req, res) {
    try {
        const { name, bio, country, languages, skills, isSeller } = req.body

        const updateData = {}

        if (name !== undefined) updateData.name = name
        if (bio !== undefined) updateData.bio = bio
        if (country !== undefined) updateData.country = country
        if (languages !== undefined) updateData.languages = languages
        if (skills !== undefined) updateData.skills = skills
        if (isSeller !== undefined) updateData.isSeller = isSeller

        if (req.file && req.file.url) {
            updateData.avatarUrl = req.file.url
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            updateData,
            {
                new: true,
                runValidators: true
            }
        ).select(
            "username email name avatarUrl bio country languages skills isSeller createdAt"
        )

        if (!updatedUser) {
            return res.status(404).json({
                message: "User not found"
            })
        }

        return res.status(200).json(updatedUser)

    } catch (err) {
        console.error(err)

        return res.status(500).json({
            message: "Internal Server Error"
        })
    }
}

async function deleteProfile(req, res) {
    try {
        const deletedProfile = await User.findByIdAndUpdate(req.user._id,
            {
                isDeleted: true
            },
            {
                new: true
            }
        )

        if (!deletedProfile) {
            return res.status(404).json({ message: 'User not found' })
        }

        return res.status(200).json({ message: 'Profile deleted successfully' })

    } catch (err) {
        console.error(err)

        return res.status(500).json({
            message: "Internal Server Error",
        })
    }
}

module.exports = {
    getProfile,
    getMyProfile,
    updateProfile,
    deleteProfile
};