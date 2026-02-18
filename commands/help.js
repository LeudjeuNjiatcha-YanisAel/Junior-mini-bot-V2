const settings = require('../settings');
const fs = require('fs');
const path = require('path');

async function helpCommand(sock, chatId, message) {

const menu = `
╔══════════════════════════╗
║      🤖 *'MachineBot-RB3'*}      ║
╠══════════════════════════╣
║ 👑 Owner   : ${settings.botOwner || 'Mr Robot'}
║ ⚡ Version : ${settings.version || '20'}
║ 🔥 Mode    : Premium
╚══════════════════════════╝

╭━━━〔 🌐 GENERAL 〕━━━╮
┃ ✦ *ping*
┃ ✦ *alive*
┃ ✦ *owner*
┃ ✦ *groupinfo*
┃ ✦ *topmembers*
┃ ✦ *delete*
┃ ✦ *sticker*
┃ ✦ *emojimix*
┃ ✦ *ss*
┃ ✦ *online*
╰━━━━━━━━━━━━━━━━━━╯

╭━━━〔 👑 ADMIN 〕━━━╮
┃ ✦ *kick*
┃ ✦ *promote*
┃ ✦ *demote*
┃ ✦ *mute*
┃ ✦ *unmute*
┃ ✦ *tagall*
┃ ✦ *antidelete*
┃ ✦ *setgname*
┃ ✦ *setgdesc*
┃ ✦ *setgpp*
╰━━━━━━━━━━━━━━━━━━╯

╭━━━〔 🎮 JEUX 〕━━━╮
┃ ✦ *tictactoe*
┃ ✦ *capital*
┃ ✦ *million*
┃ ✦ *slam*
┃ ✦ *ship*
╰━━━━━━━━━━━━━━━━━━╯

╭━━━〔 🤖 IA 〕━━━╮
┃ ✦ *gpt*
┃ ✦ *gemini*
┃ ✦ *image*
┃ ✦ *chatbot*
┃ ✦ *genere*
┃ ✦ *translate*
╰━━━━━━━━━━━━━━━━━━╯

╭━━━〔 🎵 DOWNLOAD 〕━━━╮
┃ ✦ *play*
┃ ✦ *youtube*
┃ ✦ *ytmp3*
┃ ✦ *ytmp4*
┃ ✦ *tiktok*
╰━━━━━━━━━━━━━━━━━━╯

╔══════════════════════════╗
║ ⚡ Rapide • 🔒 Sécurisé • 🤖 Intelligent ║
╚══════════════════════════╝
`;

try {
    const imagePath = path.join(__dirname, '../assets/bot_image.jpeg');
    
    if (fs.existsSync(imagePath)) {
        const imageBuffer = fs.readFileSync(imagePath);
        await sock.sendMessage(chatId, {
            image: imageBuffer,
            caption: menu
        }, { quoted: message });
    } else {
        await sock.sendMessage(chatId, { text: menu }, { quoted: message });
    }

} catch (err) {
    console.error(err);
    await sock.sendMessage(chatId, { text: menu }, { quoted: message });
}
}

module.exports = helpCommand;
