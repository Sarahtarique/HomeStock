const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const path = require("path");
const dotenv = require("dotenv");
const session = require("express-session");
const MongoStore = require("connect-mongo");

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// ===== MongoDB Connection =====
const mongoURI = process.env.MONGO_URI;

mongoose
  .connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ===== Session Configuration =====
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
      mongoUrl: mongoURI,
      collectionName: "sessions",
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 30 * 6, // 6 months
    },
  })
);

// ===== Middleware =====
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public"));

// ===== Mongoose Schemas =====
const userSchema = new mongoose.Schema({
  fullName: String,
  username: String,
  email: String,
  phone: String,
  password: String,
  gender: String,
});
const User = mongoose.model("User", userSchema);

const itemSchema = new mongoose.Schema({
  itemName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  quantityUnit: {
    type: String,
    enum: ["gram", "kg", "ml", "liter", "piece"], // ✅ gram is supported
    default: "piece",
  },
  location: { type: String, required: true },
  usageDays: { type: Number, required: true },
  daysLeft: { type: Number, required: true },
  expiryDate: { type: Date },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
});
const Item = mongoose.model("Item", itemSchema);

// ===== Auth Middleware =====
function requireLogin(req, res, next) {
  if (!req.session.userId) return res.redirect("/login");
  next();
}

// ===== Page Routes =====
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "signup.html"));
});
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});
app.get("/dashboard", requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// ===== Auth Routes =====
app.post("/register", async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.send("<h2>✅ Registration successful</h2><a href='/login'>Login</a>");
  } catch (err) {
    console.error("Register error:", err.message);
    res.status(500).send("❌ Registration failed");
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email, password });
  if (user) {
    req.session.userId = user._id;
    res.redirect("/dashboard");
  } else {
    res.send("<h2>❌ Invalid credentials</h2><a href='/login'>Try Again</a>");
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

// ===== Item Routes =====
app.post("/add-item", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ success: false });

  try {
    const item = new Item({
      ...req.body,
      userId: req.session.userId,
      expiryDate: req.body.expiryDate || null,
    });

    await item.save();
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Item error:", err.message);
    res.status(500).json({ success: false });
  }
});

app.get("/items", async (req, res) => {
  if (!req.session.userId) return res.status(401).json([]);
  try {
    const items = await Item.find({ userId: req.session.userId });
    res.json(items);
  } catch (err) {
    console.error("❌ Get items error:", err.message);
    res.status(500).json([]);
  }
});

app.delete("/delete-item/:id", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ success: false });
  try {
    const deleted = await Item.findOneAndDelete({
      _id: req.params.id,
      userId: req.session.userId,
    });
    res.json({ success: !!deleted });
  } catch (err) {
    console.error("❌ Delete item error:", err.message);
    res.status(500).json({ success: false });
  }
});

// ===== Start Server =====
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
