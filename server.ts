import express from "express";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://testuser:testpassword123@cluster0.vulsn3z.mongodb.net/?appName=Cluster0";
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-jwt-key-for-dev";

// Connect to MongoDB
mongoose.connect(MONGO_URI).then(() => {
  console.log("Connected to MongoDB");
}).catch(err => {
  console.error("MongoDB connection error:", err);
});

// User Schema
const userSchema = new mongoose.Schema({
  googleId: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  name: { type: String, required: true },
  picture: { type: String },
  maxLevel: { type: Number, default: 1 },
  totalCoins: { type: Number, default: 0 }
});
const User = mongoose.model("User", userSchema);

// Stats Schema
const statsSchema = new mongoose.Schema({
  id: { type: String, default: "global", unique: true },
  totalVisitors: { type: Number, default: 0 }
});
const Stats = mongoose.model("Stats", statsSchema);

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  app.use(express.json());
  app.use(cookieParser());

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  let livePlayers = 0;
  let totalVisitors = 0;

  // Initialize totalVisitors from DB
  try {
    const stats = await Stats.findOne({ id: "global" });
    if (stats) {
      totalVisitors = stats.totalVisitors;
    } else {
      await Stats.create({ id: "global", totalVisitors: 0 });
    }
  } catch (err) {
    console.error("Error fetching stats:", err);
  }

  io.on("connection", (socket) => {
    livePlayers++;
    totalVisitors++;
    
    // Broadcast updated stats to all clients
    io.emit("stats", { livePlayers, totalVisitors });

    // Update DB asynchronously
    Stats.updateOne({ id: "global" }, { $inc: { totalVisitors: 1 } }, { upsert: true }).catch(console.error);

    socket.on("disconnect", () => {
      livePlayers = Math.max(0, livePlayers - 1);
      io.emit("stats", { livePlayers, totalVisitors });
    });
  });

  // Auth Middleware
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.cookies.auth_token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Google OAuth Routes
  app.get("/api/auth/url", (req, res) => {
    const redirectUri = process.env.APP_URL ? `${process.env.APP_URL}/auth/google/callback` : `${req.protocol}://${req.get("host")}/auth/google/callback`;
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "consent"
    });
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    res.json({ url: authUrl });
  });

  app.get(["/auth/google/callback", "/auth/google/callback/"], async (req, res) => {
    const { code } = req.query;
    const redirectUri = process.env.APP_URL ? `${process.env.APP_URL}/auth/google/callback` : `${req.protocol}://${req.get("host")}/auth/google/callback`;
    
    try {
      // Exchange code for token
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: code as string,
          client_id: process.env.GOOGLE_CLIENT_ID || "",
          client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
          redirect_uri: redirectUri,
          grant_type: "authorization_code"
        })
      });
      const tokenData = await tokenResponse.json();
      
      if (!tokenData.id_token) {
        throw new Error("Failed to get ID token");
      }

      // Decode ID token (it's a JWT, we can just decode the payload)
      const payloadBase64 = tokenData.id_token.split('.')[1];
      const decodedPayload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf-8'));
      
      // Find or create user
      let user = await User.findOne({ googleId: decodedPayload.sub });
      if (!user) {
        user = new User({
          googleId: decodedPayload.sub,
          email: decodedPayload.email,
          name: decodedPayload.name,
          picture: decodedPayload.picture
        });
        await user.save();
      }

      // Create session JWT
      const sessionToken = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "7d" });
      
      res.cookie("auth_token", sessionToken, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("OAuth Error:", error);
      res.status(500).send("Authentication failed");
    }
  });

  app.get("/api/auth/me", authenticate, async (req: any, res: any) => {
    try {
      const user = await User.findById(req.user.userId);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json(user);
    } catch (err) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("auth_token", { secure: true, sameSite: "none", httpOnly: true });
    res.json({ success: true });
  });

  app.post("/api/progress", authenticate, async (req: any, res: any) => {
    try {
      const { level, coins } = req.body;
      const user = await User.findById(req.user.userId);
      if (!user) return res.status(404).json({ error: "User not found" });
      
      if (level > user.maxLevel) {
        user.maxLevel = level;
      }
      user.totalCoins += coins;
      await user.save();
      
      res.json(user);
    } catch (err) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/leaderboard", async (req, res) => {
    try {
      const users = await User.find().sort({ maxLevel: -1, totalCoins: -1 }).limit(50).select("name picture maxLevel totalCoins");
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
