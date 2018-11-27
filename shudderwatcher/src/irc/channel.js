const MessageStatistics = require('./messagestatistics.js');

class Channel {
    constructor(channelName) {
        this.channelName = channelName;
        this.stats = new MessageStatistics();
        //TODO: Download channel emote set

        let statRef = this.stats;
        let report = () => {
            if (this.stats.data.length) {
                console.log(channelName, 'Message Report');
                statRef.report();
            }
            setTimeout(report, 30000)
        }
        report();
    }

    onMessage(message) {
        this.stats.observe(message);
    }

    onPart() {
        console.log('Leaving channel.. final report');
        this.stats.report();
    }
}

module.exports = Channel;