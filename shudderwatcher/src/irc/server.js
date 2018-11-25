const WebSocket = require('ws');
const config = require('../config.json');
const ChatStatistics = require('./chatstatistics.js');

class Server {
    constructor(options) {
        this.username = options.username;
        this.password = options.password;
        this.channel = options.channel;

        this.server = config.irc.endpoint;
        this.port = config.irc.port;

        this.stats = new ChatStatistics();

        let statRef = this.stats;
        let report = () => {
            statRef.report();
            setTimeout(report, 10000)
        }
        report();
    }

    open() {
        this.webSocket = new WebSocket(`wss://${this.server}:${this.port}/`, 'irc');
        this.webSocket.onmessage = this.onMessage.bind(this);
        this.webSocket.onerror = (msg) => console.log('Error:', msg);
        this.webSocket.onclose = () => {
            console.log('Disconnected')
            process.exit();
        };
        this.webSocket.onopen = this.onOpen.bind(this);
    }

    onMessage(message) {
        if (message !== null) {
            var parsed = this.parseMessage(message.data);
            if (parsed.command === "PRIVMSG") {
                this.stats.observe(parsed);
            }
            else {
                console.log('>>>', message.data);
            }
        }
    }

    parseMessage(rawMessage) {
        var parsedMessage = {
            message: null,
            tags: null,
            command: null,
            channel: null,
            username: null
        };

        if (rawMessage[0] === '@') {
            var tagIndex = rawMessage.indexOf(' '),
                userIndex = rawMessage.indexOf(' ', tagIndex + 1),
                commandIndex = rawMessage.indexOf(' ', userIndex + 1),
                channelIndex = rawMessage.indexOf(' ', commandIndex + 1),
                messageIndex = rawMessage.indexOf(':', channelIndex + 1);

            parsedMessage.tags = rawMessage.slice(0, tagIndex);
            parsedMessage.username = rawMessage.slice(tagIndex + 2, rawMessage.indexOf('!'));
            parsedMessage.command = rawMessage.slice(userIndex + 1, commandIndex);
            parsedMessage.channel = rawMessage.slice(commandIndex + 1, channelIndex);
            parsedMessage.message = rawMessage.slice(messageIndex + 1);
        } else if (rawMessage.startsWith("PING")) {
            parsedMessage.command = "PING";
            parsedMessage.message = rawMessage.split(":")[1];
        }

        return parsedMessage;
    }

    onOpen() {
        var socket = this.webSocket;
        if (socket !== null && socket.readyState === 1) {
            if (config.irc.capability_negotiation.length) {
                const cap_req = config.irc.capability_negotiation.join(' ');
                socket.send(`CAP REQ :${cap_req}`);
            }
            socket.send('PASS ' + this.password);
            socket.send('NICK ' + this.username);
            socket.send('JOIN ' + this.channel);
        }
    }

    close() {
        if (this.webSocket) {
            this.webSocket.close();
        }
    }
}

module.exports = Server;