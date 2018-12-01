const bucketDurationMSDefault = 30000;

export default class Messages {

    constructor(messages) {
        this.messages = messages;
        this.imageKeys = new Set();
    }

    bucketsByMessagesCreate(options) {
        const duration = options.bucket_duration || bucketDurationMSDefault;
        const domainStart = options.start_time || this.messages[0].time;
        const domainEnd = options.end_time || this.messages[this.messages.length - 1].time;

        const buckets = [];
        this.imageKeys.clear();

        console.time('Bucket Creation');
        for (let t = domainStart; t <= domainEnd; t += duration) {
            buckets.push(_bucketCreate(t, duration));
        }

        let bucket = buckets[0];
        for (let i = 0, l = this.messages.length; i < l; i++) {
            const message = this.messages[i];
            if (message.time < bucket.start) {
                continue;
            } else if (message.time > bucket.end) {
                bucket = buckets.filter(b => b.start <= message.time && message.time < b.end)[0];
                if (!bucket) break;
            }

            _bucketObserveMessage(bucket, message, this.imageKeys);
        }
        
        console.timeEnd('Bucket Creation');
        return buckets;
    }
}

function _bucketCreate(timeMS, durationMS) {
    return {
        start: +timeMS,
        end: +timeMS + durationMS,
        users: new Set(),
        emotes: {},
        emotesNoSpam: {},
        emoteCount: 0,
        messages: 0
    };
}

function _bucketObserveMessage(bucket, message, imageKeys) {
    bucket.messages++;
    bucket.users.add(message.user);
    bucket.emoteCount += Object.keys(message.emotes).reduce((p, c) => p + message.emotes[c], 0);
    for (let key in message.emotes) {
        imageKeys.add(key);
        bucket.emotes[key] = bucket.emotes[key] || 0;
        bucket.emotes[key] += message.emotes[key];
        bucket.emotesNoSpam[key] = bucket.emotesNoSpam[key] || 0;
        bucket.emotesNoSpam[key]++;
    }
}