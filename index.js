require('./settings')
require('dotenv').config()

const { updateQR, updateStatus } = require('./web/server')

const fs = require('fs')
const chalk = require('chalk')
const axios = require('axios')
const path = require('path')
const readline = require('readline')

const { handleMessages, handleStatus } = require('./main')
const { reactToAllMessages } = require('./lib/reactions')

const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    jidNormalizedUser,
    delay
} = require("@whiskeysockets/baileys")

const NodeCache = require("node-cache")
const pino = require("pino")

const store = require('./lib/lightweight_store')
const settings = require('./settings')

store.readFromFile()
setInterval(() => store.writeToFile(), settings.storeWriteInterval || 10000)

const AUTH_FOLDER = path.join(__dirname, './session')
const CREDS_PATH = path.join(AUTH_FOLDER, 'creds.json')

/* =============================
   RESTAURATION SESSION RENDER
============================= */
if (process.env.SESSION_DATA && !fs.existsSync(CREDS_PATH)) {
    try {
        const sessionBuffer = Buffer.from(process.env.SESSION_DATA, 'base64')
        fs.writeFileSync(CREDS_PATH, sessionBuffer)
        console.log('✅ Session restaurée depuis ENV (Render)')
    } catch (err) {
        console.error('❌ Erreur restauration session:', err)
    }
}

/* =============================
   AUTO PING RENDER
============================= */
setInterval(async () => {
    try {
        const url = process.env.RENDER_EXTERNAL_URL
        if (!url) return
        await axios.get(url)
        console.log('🔁 Auto-ping Render OK')
    } catch {
        console.log('⚠️ Auto-ping échoué')
    }
}, 5 * 60 * 1000)

/* =============================
   MONITORING RAM
============================= */
setInterval(() => {
    if (global.gc) {
        global.gc()
        console.log('🧹 Nettoyage mémoire')
    }
}, 60000)

setInterval(() => {
    const used = process.memoryUsage().rss / 1024 / 1024
    if (used > 400) {
        console.log('⚠️ RAM trop élevée, redémarrage...')
        process.exit(1)
    }
}, 30000)

/* =============================
   BOT START
============================= */

async function startBot() {
    try {
        let { version } = await fetchLatestBaileysVersion()
        const { state, saveCreds } = await useMultiFileAuthState('./session')
        const msgRetryCounterCache = new NodeCache()

        const sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            browser: ["Ubuntu", "Chrome", "20.0.04"],
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(
                    state.keys,
                    pino({ level: "fatal" })
                ),
            },
            markOnlineOnConnect: true,
            msgRetryCounterCache,
            getMessage: async (key) => {
                let jid = jidNormalizedUser(key.remoteJid)
                let msg = await store.loadMessage(jid, key.id)
                return msg?.message || ""
            },
        })

        sock.ev.on('creds.update', saveCreds)
        store.bind(sock.ev)

        /* =============================
           PAIRING CODE GLOBAL (Dashboard)
        ============================= */
        global.generatePairingCode = async (number) => {
            try {
                number = number.replace(/[^0-9]/g, '')
                let code = await sock.requestPairingCode(number)
                return code?.match(/.{1,4}/g)?.join("-") || code
            } catch {
                return "Erreur génération"
            }
        }

        /* =============================
           MESSAGE HANDLER
        ============================= */
        sock.ev.on('messages.upsert', async (chatUpdate) => {
            try {
                const mek = chatUpdate.messages[0]
                if (!mek?.message) return

                await reactToAllMessages(sock, mek)

                mek.message =
                    Object.keys(mek.message)[0] === 'ephemeralMessage'
                        ? mek.message.ephemeralMessage.message
                        : mek.message

                if (mek.key?.remoteJid === 'status@broadcast') {
                    await handleStatus(sock, chatUpdate)
                    return
                }

                await handleMessages(sock, chatUpdate, true)

            } catch (err) {
                console.error("Erreur messages.upsert :", err)
            }
        })

        /* =============================
           CONNECTION UPDATE
        ============================= */
        sock.ev.on('connection.update', async (s) => {
            const { connection, qr } = s

            if (qr) {
                console.log('📱 QR généré')
                updateQR(qr)
            }

            if (connection === "connecting") {
                console.log('🔄 Connexion...')
                updateStatus("connecting")
            }

            if (connection === "open") {
                console.log('🤖 Bot connecté !')
                updateStatus("connected")
            }

            if (connection === "close") {
                console.log('❌ Déconnecté, reconnexion...')
                updateStatus("disconnected")
                await delay(5000)
                startBot()
            }
        })

        return sock

    } catch (error) {
        console.error('Erreur startBot :', error)
        await delay(5000)
        startBot()
    }
}

startBot()

/* =============================
   PROCESS SAFETY
============================= */
process.on('uncaughtException', (err) => {
    console.error('Exception non capturée :', err)
})

process.on('unhandledRejection', (err) => {
    console.error('Promesse rejetée non gérée :', err)
})

/* =============================
   AUTO RELOAD FILE
============================= */
let file = require.resolve(__filename)
fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log(chalk.redBright(`Mise à jour détectée : ${__filename}`))
    delete require.cache[file]
    require(file)
})
