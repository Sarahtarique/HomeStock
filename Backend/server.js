const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config(); // Load environment variables

const User = require("./models/user");   // User Schema
const Item = require("./models/item");   // Item Schema

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public")); // Serve static assets (HTML, CSS, JS)

// MongoDB Atlas Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log("✅ Connected to MongoDB Atlas");
})
.catch((err) => {
  console.error("❌ MongoDB Atlas connection error:", err);
});

// Serve Signup Page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "signup.html"));
});

// Serve Login Page
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// Serve Dashboard Page
app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// Handle Registration
app.post("/register", async (req, res) => {
  try {
    const { fullName, username, email, phone, password, gender } = req.body;

    const user = new User({ fullName, username, email, phone, password, gender });
    await user.save();

    res.send(`
      <h2 style="text-align:center;margin-top:50px;">✅ Registration Successful!</h2>
      <p style="text-align:center;"><a href='/login.html'>Go to Login</a></p>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Error saving user");
  }
});

// Handle Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email, password });

    if (user) {
      res.redirect("/dashboard");
    } else {
      res.send(`
        <h2 style="color:red;text-align:center;">❌ Invalid email or password</h2>
        <p style="text-align:center;"><a href="/login.html">Try again</a></p>
      `);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Server error during login");
  }
});

// Handle Add Item
app.post("/add-item", async (req, res) => {
  try {
    const { itemName, quantity, location } = req.body;

    const item = new Item({ itemName, quantity, location });
    await item.save();

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error saving item:", err);
    res.status(500).json({ success: false });
  }
});

// Fetch All Items
app.get("/items", async (req, res) => {
  try {
    const items = await Item.find();
    res.json(items);
  } catch (err) {
    console.error("❌ Error fetching items:", err);
    res.status(500).json([]);
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
