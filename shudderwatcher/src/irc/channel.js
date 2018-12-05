const fs = require('fs');
const MessageStatistics = require('./messagestatistics.js');

class Channel {
    constructor(channelName, stream) {
        this.channelName = channelName;
        this.stream = stream;
        this.joined_time = new Date().getTime();
        this.stats = new MessageStatistics();
        //TODO: Download channel emote set

        let statRef = this.stats;
        let report = () => {
            if (this.stats.data.length) {
                statRef.reportHighLevel(channelName);
            }
            this.reportTimeoutId = setTimeout(report, 30000)
        }
        report();
    }

    onMessage(message) {
        this.stats.observe(message);
    }

    onPart() {
        console.log(`Leaving ${this.channelName}.. final report`);
        this.stats.report();
    }

    filename() {
        return `${this.channelName}_${this.joined_time}_${this.stream.created}_${this.stream.game}.json`;
    }

    writeFile() {
        return new Promise((resolve, reject) => {
            fs.writeFile(
                this.filename(),
                JSON.stringify(this.stats.data),
                err => err ? reject(err) : resolve()
            )
        });
    }
}

module.exports = Channel;