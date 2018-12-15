const fs = require('fs');
const MessageStatistics = require('./messagestatistics.js');

class Channel {
    constructor(channelName, stream) {
        this.channelName = channelName;
        this.stream = stream;
        this.joined_time = new Date().getTime();
        this.messages = [];
        this.stats = new MessageStatistics();
    }

    onMessage(message) {
        this.stats.observe(message);
        this.messages.push(message);
    }

    statusReport() {
        this.stats.reportHighLevel(this.channelName);
    }

    filename() {
        return `${this.channelName}_${this.joined_time}_${this.stream.created}_${this.stream.game}.json`;
    }

    writeFile(rootFilePath='./') {
        return new Promise((resolve, reject) => fs.writeFile(
            rootFilePath + this.filename(),
            JSON.stringify({
                'stream': {
                    '_id': this.stream._id,
                    'game': this.stream.game
                },
                'channel': {
                    '_id': this.stream.channel._id,
                    'name': this.stream.channel.name,
                    'display_name': this.stream.channel.display_name
                },
                'video': this.stream.video,
                'messages': this.messages
            }),
            err => err ? reject(err) : resolve()
        ));
    }
}

module.exports = Channel;