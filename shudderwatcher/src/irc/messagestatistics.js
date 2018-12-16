const chalk = require('chalk');

class MessageStatistics {
    constructor() {
        this.bucket_duration_ms = 30000;
        this.data = [];
        this.message_count = 0;
        this.emote_count = 0;
        this.usersUnique = new Set();
        this.emotesUnique = new Set();
    }

    observe(data) {
        const username = data.username;
        const timestamp = +data.tags['tmi-sent-ts'];
        const emoteCountsById = {};

        // Emotes
        const emoteTag = data.tags['emotes'];
        if (emoteTag) {
            // In the format of:
            // 16396:3-11/12006:13-20,22-29/16190:31-39
            // 1217039:69-75/55338:77-86
            // 1039217:0-6
            emoteTag.split('/').forEach(e => {
                const emoteParts = e.split(':');
                const eId = emoteParts[0];
                const eCount = emoteParts[1].split(',').length;
                emoteCountsById[eId] = eCount;
                this.emotesUnique.add(eId);
                this.emote_count += eCount;
            });
        }

        this.message_count++;
        this.usersUnique.add(username);
        this.data.push({
            time: timestamp,
            user: username,
            emotes: emoteCountsById
        });
    }

    reportHighLevel(name) {
        if (this.data.length) {
            const dateOldest = new Date(+this.data[0].time).toISOString();
            const duration = (this.data[this.data.length-1].time - this.data[0].time) / 1000 /60;
            const msgToUser = this.usersUnique.size ? this.message_count / this.usersUnique.size : null;
            const msgToUserDisplay = msgToUser ? msgToUser.toFixed(1) + 'x' : '';
            const emoteMultiplier = this.emotesUnique.size ? this.emote_count / this.emotesUnique.size : null;
            const emoteMultiplierDisplay = emoteMultiplier ? emoteMultiplier.toFixed(1) + 'x' : '';

            const reportPrefix = chalk.bgBlueBright('  ');
            console.log(`${reportPrefix}${name.slice(0, 12)}\t${dateOldest.slice(0, 10)}\t${duration.toFixed(1)} Mins
    ${reportPrefix}  M:${('00000'+this.message_count).slice(-5)} (U:${this.usersUnique.size}) [${msgToUserDisplay}]\tE:${this.emote_count} (${this.emotesUnique.size}) [${emoteMultiplierDisplay}]`);
        }
    }
}

module.exports = MessageStatistics;