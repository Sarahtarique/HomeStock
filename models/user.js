const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  fullName: String,
  username: String,
  email: String,
  phone: String,
  password: String,
  gender: String
});

module.exports = mongoose.model("User", userSchema);
