require("./config/env")

const express = require("express")
const cors = require("cors")

const app = express()

const session = require("express-session")

const { MongoStore } = require("connect-mongo");

const connectDB = require("./config/db")

const authRoutes = require("./routes/auth.routes")
const userRoutes = require("./routes/user.routes")
const adminRoutes = require("./routes/admin.routes")

const PORT = process.env.PORT

const allowedOrigins = process.env.ALLOWED_CLIENTS
    ? process.env.ALLOWED_CLIENTS.split(",").map(origin => origin.trim())
    : ["http://localhost:5173", "http://localhost:5174"];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (such as mobile apps or curl) or if origin is in allowedOrigins
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error("Not allowed by CORS"));
    },
    credentials: true
}));

app.use(express.json())


app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        name: "connect.sid",

        store: MongoStore.create({
            mongoUrl: process.env.MONGODB_URI,
            dbName: process.env.DB_NAME,
            ttl: 60 * 60
        }),

        cookie: {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            maxAge: 1000 * 60 * 60
        }
    })
);

app.use("/api/auth", authRoutes)
app.use("/api/user", userRoutes)
app.use("/api/admin", adminRoutes)

app.get("/", (req, res) => {
    res.send("Authentication Server is Running")
})


async function startServer() {
    try {
        const db = await connectDB()

        console.log("MongoDB Connected Successfully")

        app.locals.db = db

        app.listen(PORT, () => {
            console.log(`Server Started at http://localhost:${PORT}/`)
        })


    } catch (error) {

        console.error(error)

        console.log("Failed to Start Server")

        process.exit(1)

    }

}

startServer()