const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Adivinha? Responde com \"PONG!\" né idiota..'),

    async execute(interaction) {
        var name = interaction.member.nickname;
        if (!name) {
            console.log('User without nickname, searching for username');
            name = interaction.user.username;
        }
        await interaction.reply(`Pong ${name}!`)
    }
}