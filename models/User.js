const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },

    hashedPassword: {
      type: String,
      required: true
    },

    name: {
      type: String,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },

    avatarUrl: {
      type: String,
      default: ''
    },

    bio: {
      type: String,
      trim: true
    },

    country: {
      type: String,
      trim: true
    },

    languages: [{
      type: String,
      trim: true
    }],

    skills: [{
      type: String,
      trim: true
    }],

    isSeller: {
      type: Boolean,
      default: false
    },

    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    }
  },
  { timestamps: true }
)

userSchema.set("toJSON", {
  transform: (document, returnedObject) => {
    delete returnedObject.hashedPassword;
  },
});

const User = mongoose.model("User", userSchema);

module.exports = User;
