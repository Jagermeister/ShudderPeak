const globalEmotes = require('../emoticon_images_0.json');
const channelEmotes = require('../emoticon_images_2138.json');

const emotesById = {};
channelEmotes.emoticon_sets['2138'].forEach(element => {
    emotesById[element.id] = element.code;
});
globalEmotes.emoticon_sets['0'].forEach(element => {
    emotesById[element.id] = element.code;
});


class ChatStatistics {
    constructor() {
        this.bucket_duration_ms = 30000;
        /*
        this.bucket_count_max = 10;
        this.buckets = [{
            start: Date.now(),
            users: new Set(),
        }];
        this.bucket_count = this.buckets.length;
        */

        this.data = [];
        this.message_count = 0;

        this.emoteRegex = /emotes=(.*?);/;
        this.timeRegex = /tmi-sent-ts=(.*?);/;
    }

    observe(data) {
        const username = data.username;
        const timestamp = this.timeRegex.exec(data.tags)[1];
        const emoteCountsById = {};

        // Emotes
        const emoteMatch = this.emoteRegex.exec(data.tags);
        if (emoteMatch && emoteMatch[1] !== "") {
            // In the format of:
            // 16396:3-11/12006:13-20,22-29/16190:31-39
            // 1217039:69-75/55338:77-86
            // 1039217:0-6
            const emotes = emoteMatch[1].split('/');
            emotes.forEach(e => {
                const emoteParts = e.split(':');
                const eId = emoteParts[0];
                const eCount = emoteParts[1].split(',').length;
                emoteCountsById[eId] = eCount;
            });
        }

        this.message_count++;
        this.data.push({
            time: timestamp,
            user: username,
            emotes: emoteCountsById
        });
    }

    report() {
        if (this.data.length) {
            const timeMinCutoff = +this.data[0].time;
            const now = Date.now() + this.bucket_duration_ms;
            //this.data = this.data.filter(d => d.time > timeMinCutoff);

            const users = new Set();
            let messageCount = 0,
                emoteCount = 0;

            let buckets = [];
            for (let t = timeMinCutoff; t <= now; t += this.bucket_duration_ms) {
                buckets.push({
                    start: +t,
                    end: +t + this.bucket_duration_ms,
                    users: new Set(),
                    emotes: {},
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
                for (let key in d.emotes) {
                    bucket.emotes[key] = bucket.emotes[key] || 0;
                    bucket.emotes[key] += d.emotes[key];
                    emoteCount += d.emotes[key];
                }
            }

            const dateOldest = new Date(buckets[0].start).toISOString();
            console.log(dateOldest.slice(0, 10), `\tusers (${users.size}), msgs (${messageCount}), emotes (${emoteCount}),`, new Date(Date.now()).toISOString());
            for (let i = 0; i < buckets.length; i++) {
                const b = buckets[i];
                let emotes = Object.keys(b.emotes).map(k => [k, b.emotes[k]]).sort((a, b) => b[1] - a[1]);
                console.log(
                    ' ' + new Date(b.start).toISOString().slice(10, 19) + '\t',
                    (b.users.size < 9999 ? ('0000' + b.users.size).slice(-4) : b.users.size) + '\t',
                    (b.messages < 9999 ? ('0000' + b.messages).slice(-4) : b.messages) + '\t\t',
                    emotes.length ? `${('0000' + emotes[0][1]).slice(-4)} ${emotesById[emotes[0][0]]} (${emotes[0][0]})` : ''
                );
            }
        }
    }
}


module.exports = ChatStatistics