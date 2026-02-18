const socket = io()

function showQR() {
    document.getElementById("authArea").innerHTML =
        `<div id="qr"></div>`
}

function showCode() {
    document.getElementById("authArea").innerHTML =
        `
        <input id="number" placeholder="2376xxxxxxxx"/>
        <button onclick="generateCode()">Générer</button>
        <div id="pairing"></div>
        `
}

function generateCode() {
    const number = document.getElementById("number").value
    socket.emit("requestPairing", number)
}

socket.on("qr", (qr) => {
    if (!qr) return
    document.getElementById("qr").innerHTML =
        `<img class="fade" src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${qr}"/>`
})

socket.on("pairing", (code) => {
    document.getElementById("pairing").innerHTML =
        `<h3 class="fade">${code}</h3>`
})

socket.on("status", (status) => {
    const el = document.getElementById("statusIndicator")
    if (status === "connected") {
        el.innerHTML = "🟢 Connecté"
        el.className = "status online"
    } else {
        el.innerHTML = "🔴 Déconnecté"
        el.className = "status offline"
    }
})

socket.on("stats", (stats) => {
    document.getElementById("ram").innerText = stats.ram
    document.getElementById("uptime").innerText = stats.uptime
    document.getElementById("cpu").innerText = stats.cpu
})
