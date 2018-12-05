const globalEmotes = require('../emoticon_images_0.json');

const emotesById = {};
globalEmotes.emoticon_sets['0'].forEach(element => {
    emotesById[element.id] = element.code;
});


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
        const dateOldest = new Date(+this.data[0].time).toISOString();
        const duration = (this.data[this.data.length-1].time - this.data[0].time) / 1000 /60;
        const msgToUser = this.usersUnique.size ? this.message_count / this.usersUnique.size : null;
        const msgToUserDisplay = msgToUser ? msgToUser.toFixed(1) + 'x' : '';
        const emoteMultiplier = this.emotesUnique.size ? this.emote_count / this.emotesUnique.size : null;
        const emoteMultiplierDisplay = emoteMultiplier ? emoteMultiplier.toFixed(1) + 'x' : '';

        console.log(`  ${name.slice(0, 12)}\t${dateOldest.slice(0, 10)}\t${duration.toFixed(1)} Mins
    M:${('00000'+this.message_count).slice(-5)} (U:${this.usersUnique.size}) [${msgToUserDisplay}]\tE:${this.emote_count} (${this.emotesUnique.size}) [${emoteMultiplierDisplay}]`);
    }

    report() {
        if (this.data.length) {
            const timeMinCutoff = this.data[0].time;
            const now = Date.now() + this.bucket_duration_ms;

            const users = new Set();
            let messageCount = 0,
                emoteCount = 0,
                emoteDistinctCount = 0;

            let buckets = [];
            for (let t = timeMinCutoff; t <= now; t += this.bucket_duration_ms) {
                buckets.push({
                    start: +t,
                    end: +t + this.bucket_duration_ms,
                    users: new Set(),
                    emotes: {},
                    emotesNoSpam: {},
                    messages: 0
                });
            }

            let bucket = buckets[0];
            for (let i = 0, l = this.data.length; i < l; i++) {
                const d = this.data[i];
                if (d.time > bucket.end) {
                    bucket = buckets.filter(b => b.start <= d.time && d.time < b.end)[0];
                }

                bucket.messages++;
                messageCount++;
                bucket.users.add(d.user);
                users.add(d.user);
                emoteDistinctCount += Object.keys(d.emotes).length;
                for (let key in d.emotes) {
                    bucket.emotes[key] = bucket.emotes[key] || 0;
                    bucket.emotes[key] += d.emotes[key];
                    bucket.emotesNoSpam[key] = bucket.emotesNoSpam[key] || 0;
                    bucket.emotesNoSpam[key]++;
                    emoteCount += d.emotes[key];
                }
            }

            const dateOldest = new Date(buckets[0].start).toISOString();
            console.log(dateOldest.slice(0, 10), `\tusers\tmsgs\temotes\tdistinct`, new Date(Date.now()).toISOString());
            for (let i = 0; i < buckets.length; i++) {
                const b = buckets[i];
                let emotes = Object.keys(b.emotes).map(k => [k, b.emotes[k], b.emotesNoSpam[k]]).sort((a, b) => b[1] - a[1]);
                console.log(
                    ' ' + new Date(b.start).toISOString().slice(10, 19) + '\t',
                    (b.users.size < 9999 ? ('0000' + b.users.size).slice(-4) : b.users.size) + '\t',
                    (b.messages < 9999 ? ('0000' + b.messages).slice(-4) : b.messages) + '\t',
                    emotes.length ? `${('0000' + emotes[0][1]).slice(-4)}\t ${('0000' + emotes[0][2]).slice(-4)}\t${emotesById[emotes[0][0]]} (${emotes[0][0]})` : ''
                );
            }
            console.log('----------', `\t-----\t----\t------\t--------`);
            console.log(('          '+buckets.length).slice(-10), `\t${('00000' + users.size).slice(-5)}\t${('00000' + messageCount).slice(-5)}\t${('00000' + emoteCount).slice(-5)}\t${('00000' + emoteDistinctCount).slice(-5)}`);
        }
    }
}

module.exports = MessageStatistics;