const express = require("express")
const session = require("express-session")
const path = require("path")
const http = require("http")
const socketIo = require("socket.io")
const os = require("os")

const app = express()
const server = http.createServer(app)
const io = socketIo(server)

const PORT = process.env.PORT || 3000
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "12345"

let latestQR = null
let pairingCode = null
let botStatus = "disconnected"

app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(express.static(path.join(__dirname, "public")))

app.use(session({
    secret: "machine-secret-key",
    resave: false,
    saveUninitialized: true
}))

function isAuth(req, res, next) {
    if (req.session.authenticated) return next()
    res.redirect("/login")
}

app.get("/", (req, res) => res.redirect("/dashboard"))

app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "views/login.html"))
})

app.post("/login", (req, res) => {
    if (req.body.password === ADMIN_PASSWORD) {
        req.session.authenticated = true
        return res.redirect("/dashboard")
    }
    res.send("❌ Mot de passe incorrect")
})

app.get("/dashboard", isAuth, (req, res) => {
    res.sendFile(path.join(__dirname, "views/dashboard.html"))
})

io.on("connection", (socket) => {
    socket.emit("qr", latestQR)
    socket.emit("pairing", pairingCode)
    socket.emit("status", botStatus)

    socket.on("requestPairing", async (number) => {
        if (global.generatePairingCode) {
            const code = await global.generatePairingCode(number)
            pairingCode = code
            io.emit("pairing", code)
        }
    })
})

function getStats() {
    return {
        ram: (process.memoryUsage().rss / 1024 / 1024).toFixed(2),
        uptime: (process.uptime() / 60).toFixed(2),
        cpu: os.loadavg()[0].toFixed(2)
    }
}

setInterval(() => {
    io.emit("stats", getStats())
}, 2000)

function updateQR(qr) {
    latestQR = qr
    io.emit("qr", qr)
}

function updateStatus(status) {
    botStatus = status
    io.emit("status", status)
}

module.exports = { server, updateQR, updateStatus }

server.listen(PORT, () => {
    console.log("🌍 Dashboard actif sur port " + PORT)
})
