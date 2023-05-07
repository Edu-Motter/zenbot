const { Client, Events, GatewayIntentBits, Collection } = require('discord.js');
require('dotenv').config();;

const { TOKEN, CLIENT_ID, GUILD_ID } = process.env

const fs = require('node:fs');
const path = require('node:path');
const { exit } = require('node:process');
const commandsPath = path.join(__dirname, 'commands');
const commandsFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

const usersMuted = new Collection();

console.log(`Commands:\n ${commandsFiles}\n`);

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.MessageContent,
	],
});
client.commands = new Collection()

for (const file of commandsFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	if ("data" in command && "execute" in command) {
		client.commands.set(command.data.name, command);
	} else {
		log(`Comando ${filePath} com null "data" ou em "execute"`);
	}
}


client.once(Events.ClientReady, c => {
	log(`Ready! Logged in as ${c.user.tag}`);
	setInterval(checkMutedUsersGPT, 5 * 60000);
	checkMutedUsersGPT(5 * 60000);
});

async function checkMutedUsersGPT(jobTimer) {
	const guild = await client.guilds.fetch(GUILD_ID);
	if (!guild) return;

	logJobStart(guild.memberCount, jobTimer);

	const members = await guild.members.fetch();
	const channels = await guild.channels.fetch();
	const afkChannel = guild.afkChannelId;
	const botChannelId = '1100247312569204778';
	
	let botChannel;
	for (const channel of channels){
		if (channel[1].id === botChannelId){
			botChannel = channel[1];	
			log(`Bot channel founded: ${botChannel.name}`);
			break;
		}
	}

	if (botChannel == undefined){
		log('Bot channel could not be found. Fix the botChannelId variable.')
		process.exit(1);
	}

	for (const [memberId, member] of members) {

		await member.fetch();
		const memberTag = member.user.tag;

		if (member.voice == null || member.voice.channel == null) {
			usersMuted.delete(memberId);
			continue;
		}

		if (member.voice && member.voice.channelId == afkChannel) {
			log(`${memberTag} is afk`);
			usersMuted.delete(memberId);
			continue;
		}


		if (member.voice && member.voice.deaf) {
			log(`${memberTag} is deaf.`);
			if (usersMuted.has(memberId)) {


				log(`Moving ${memberTag} to afk`)
				botChannel.send(`<@${memberId}> Você foi avisado..`)
				member.voice.setChannel(afkChannel);
			} else {
				botChannel.send(`<@${memberId}> Mutado vai para o away hein..`)
				usersMuted.set(memberId, memberTag);
				log(`Pushed ${memberTag} to usersMuted`);
			}

			continue;
		}

		// log(`${memberTag} channel: ${member.voice.channel}`);
		// if (member.voice && member.voice.mute) {
		// 	log(`${memberTag} is mute.`);
		// 	member.send('Desmuta ai queridão/queridona!')
		// }

		//User is clean:
		usersMuted.delete(memberId);
	}
}

async function checkMutedUsers() {
	const guild = await client.guilds.fetch(GUILD_ID);
	if (!guild) return;
	// Fetch all the members of the guild
	log(`Checking muted users..(${guild.memberCount})`);
	const members = await guild.members.fetch();

	members.forEach((member) => {
		member.fetch();
		const voiceState = member.voice;
		// if (voiceState && voiceState.channelID === member.guild.afkChannelID) {
		log(`${member.toString} is in channel (${voiceState.channelID}).`);
		return;
		// }

		if (member.voice && member.voice.deaf) {
			log(`${memberTag} is deaf.`);
			// member.send('Desmuta ai queridão/queridona!')
		}

		if (member.voice && member.voice.mute) {
			log(`${memberTag} is mute.`);
			// member.send('Desmuta ai queridão/queridona!')
		}
	});
}

client.login(TOKEN);


client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	log(interaction);
	const commandName = interaction.commandName;

	const command = interaction.client.commands.get(commandName)
	if (!command) {
		console.error(`Comando ${commandName} não encontrado`);
		await interaction.reply(`Comando ${commandName} não foi encontrado :c`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		await interaction.reply(`Houve um error ao executar o comando ${commandName}`);
	}
});

function log(text) {
	console.log(`${getDateTime()} || ${text}`)
}

function logJobStart(guildCount, jobTimer) {
	let stringMap = JSON.stringify(Array.from(usersMuted.entries()));

	if (stringMap == '[]') stringMap = '----------------{}----------------'

	console.log('\n'); 
	log(`Job executed every ${jobTimer / 60000} min`);
	log(`Guild size: ${guildCount}, checking afks..`);
	log('------------usersMuted------------');
	log(stringMap);
	log('----------------------------------')
}

function getDateTime() {
	const nowUtc = new Date();
	nowUtc.setHours(nowUtc.getUTCHours() - 3);

	const defaultFormatter = {
		timeZone: 'UTC',
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit'
	};

	return nowUtc.toLocaleString('pt-BR', defaultFormatter);
}