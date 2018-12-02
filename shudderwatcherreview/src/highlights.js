const bucketDurationMSDefault = 30000;
const bucketStatsLookbackMSDefault = 480000;

export default class Messages {

    constructor(messages) {
        this.messages = messages;
        this.imageKeys = new Set();
        this.buckets = [];
        this.bucketsHighlighted = [];
    }

    bucketsByMessagesCreate(options = {}) {
        const duration = options.bucket_duration || bucketDurationMSDefault;
        const domainStart = options.start_time || this.messages[0].time;
        const domainEnd = options.end_time || this.messages[this.messages.length - 1].time;
        this.imageKeys.clear();

        console.time('Bucket Creation');
        for (let t = domainStart; t <= domainEnd; t += duration) {
            this.buckets.push(_bucketCreate(t, duration));
        }

        let bucket = this.buckets[0];
        for (let i = 0, l = this.messages.length; i < l; i++) {
            const message = this.messages[i];
            if (message.time < bucket.start) {
                continue;
            } else if (message.time > bucket.end) {
                bucket = this.buckets.filter(b => b.start <= message.time && message.time < b.end)[0];
                if (!bucket) break;
            }

            _bucketObserveMessage(bucket, message, this.imageKeys);
        }

        console.timeEnd('Bucket Creation');
    }

    highlightBuckets(options = {}) {
        const duration = options.bucket_duration || bucketDurationMSDefault;
        const bucketLookback = bucketStatsLookbackMSDefault / duration;
        const upperBound2StDev = [];
        for (let i = 0, l = this.buckets.length; i < l; i++) {
            const b = _bucketsByLookback(this.buckets, i, bucketLookback);
            const s = _seriesStatistics(b.map(b => b.messages + b.emoteCount));
            upperBound2StDev.push(s.mean + s.standard_deviation + s.standard_deviation);
        }

        this.bucketsHighlighted = this.buckets.map((b, i) => Object.assign(b, { index: i }))
            .filter((b, i) => b.messages + b.emoteCount > upperBound2StDev[i]);
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

function _bucketsByLookback(buckets, index, lookback) {
    const lookbackIndex = index - lookback;
    const lowerBound = lookbackIndex < 0 ? 0 : lookbackIndex;
    return buckets.slice(lowerBound, index);
}

const sum = (a, b) => a + b;
const asc = (a, b) => a - b;
function _seriesStatistics(values) {
    const count = values.length;
    const mean = values.reduce(sum, 0) / count;
    const median = values.slice()
        .sort(asc)[Math.floor(count / 2)];

    const stDev = Math.sqrt(
        values.map(v => (v - mean) * (v - mean))
            .reduce(sum, 0)
        / count
    );

    const vMin = Math.min(...values);
    const vMax = Math.max(...values)

    return {
        mean: mean,
        median: median,
        standard_deviation: stDev,
        minimum: vMin,
        maximum: vMax,
        count: count
    };
}