const WebSocket = require('ws');
const config = require('../config.json');
const Channel = require('./channel.js');

class Server {
    constructor(options) {
        this.username = options.username;
        this.password = options.password;
        this.channel = options.channel;

        this.server = config.irc.endpoint;
        this.port = config.irc.port;
        this.webSocket = null;

        this.channelsByName = {};
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

    join(channelName) {
        if (!(channelName in this.channelsByName)) {
            this.send({ command: "Join Channel", message: `JOIN ${this.channel}` });
        } else {
            console.log('Already joined channel', channelName);
        }
    }

    part(channelName) {
        if (channelName in this.channelsByName) {
            this.send({ command: "Depart Channel", message: `PART ${this.channel}` });
        } else {
            console.log('Cannot leave channel you havent joined', channelName);
        }
    }

    onMessage(message) {
        if (message !== null) {
            var parsed = this.parseMessage(message.data);
            if (parsed.command === "PRIVMSG") {
                if (parsed.channel in this.channelsByName) {
                    const channel = this.channelsByName[parsed.channel];
                    channel.onMessage(parsed);
                }
            } else if (parsed.command === "CLEARCHAT") {

            } else if (parsed.command === "MODE") {

            } else if (parsed.command === "PART") {
                this.channelsByName[channelName].onPart();
                delete this.channelsByName[channelName];
            } else if (parsed.command === "JOIN") {
                const channelName = parsed.channel.slice(0, -2);
                this.channelsByName[channelName] = new Channel(channelName);
            } else if (parsed.command === "USERSTATE") {
                //@badges=;color=#8A2BE2;display-name=username;emote-sets=0;mod=0;subscriber=0;user-type= :tmi.twitch.tv USERSTATE #channelname
            } else if (parsed.command === "ROOMSTATE") {
                //@broadcaster-lang=;emote-only=0;followers-only=30;r9k=0;rituals=0;room-id=15564828;slow=0;subs-only=1 :tmi.twitch.tv ROOMSTATE #channelname
            } else if (parsed.command === "001") {
                // Welcome
            } else if (parsed.command === "353") {
                // Name list of mods?
            } else if (parsed.command === "USERNOTICE") {
                //@badges=subscriber/3,sub-gifter/1;color=;display-name=adamblevins316;emotes=;flags=;id=feed67dd-4c20-4233-adf3-e9a2e427a08e;login=adamblevins316;mod=0;msg-id=resub;msg-param-months=4;msg-param-sub-plan-name=Channel\sSubscription\s(Nickmercs);msg-param-sub-plan=1000;room-id=15564828;subscriber=1;system-msg=adamblevins316\sjust\ssubscribed\swith\sa\sTier\s1\ssub.\sadamblevins316\ssubscribed\sfor\s4\smonths\sin\sa\srow!;tmi-sent-ts=1543204589073;turbo=0;user-id=199805492;user-type= :tmi.twitch.tv USERNOTICE #channelname :pogs homie
            } else if (parsed.command === "PING") {
                this.send({ command: 'Connection Keep Alive', message: `PONG :${parsed.message}` });
            } else {
                console.log('>>>!', parsed.command, message.data);
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
            const tagIndex = rawMessage.indexOf(' '),
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
        } else {
            try {
                const usernameIndex = rawMessage.indexOf('!');
                if (usernameIndex > -1) {
                    this.parseMessage.username = rawMessage.slice(1, usernameIndex);
                }
                const components = rawMessage.split(' ');
                parsedMessage.command = components[1];
                parsedMessage.channel = components[2];
                if (components.length >= 4) {
                    parsedMessage.message = components[3].split(":")[1];
                }
            } catch(e){
                console.log('ERROR', rawMessage)
            }
        }

        return parsedMessage;
    }

    onOpen() {
        var socket = this.webSocket;
        if (socket !== null && socket.readyState === 1) {
            if (config.irc.capability_negotiation.length) {
                const cap_req = config.irc.capability_negotiation.join(' ');
                this.send({ command: "Capability Negotiation", message: `CAP REQ :${cap_req}` });
            }
            this.send({ command: "Set Password", message: `PASS ${this.password}` });
            this.send({ command: "Set Nickname", message: `NICK ${this.username}` });
            this.join(this.channel);
        }
    }

    send(message) {
        var socket = this.webSocket;
        if (socket !== null && socket.readyState === 1) {
            console.log('<<<', message.command, message.command == "Set Password" ? 'PASS oauth:********' : message.message);
            socket.send(message.message);
        } else {
            console.log('!!!', 'Socket not ready - Unable to send message: ', message);
        }
    }

    close() {
        if (this.webSocket) {
            this.webSocket.close();
        }
    }
}

module.exports = Server;