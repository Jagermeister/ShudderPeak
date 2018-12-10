const WebSocket = require('ws');
const chalk = require('chalk');
const config = require('../config.json');
const Channel = require('./channel.js');

class Server {
    constructor(options) {
        this.username = options.username;
        this.password = options.password;

        this.server = config.irc.endpoint;
        this.port = config.irc.port;
        this.webSocket = null;

        this.channelsByName = {};
        this.streamByChannelName = {};

        this.serverOnOpenResolve = null;

        setInterval(() => {
            const channels = Object.keys(this.channelsByName);
            if (channels.length) console.log(chalk.bgBlueBright.white('  Server Channel Status'));
            for (let i = 0, l = channels.length; i < l; i++) {
                const channel = this.channelsByName[channels[i]];
                channel.statusReport();
                channel.writeFile('../data/stream/');
            }
        }, 60000);
    }

    open() {
        this.webSocket = new WebSocket(`wss://${this.server}:${this.port}/`, 'irc');
        this.webSocket.onmessage = this.onMessage.bind(this);
        this.webSocket.onerror = msg => console.log('Error:', msg);
        this.webSocket.onclose = () => {
            console.log('Disconnected');
            process.exit();
        };
        this.webSocket.onopen = this.onOpen.bind(this);
        const server = this;
        return new Promise((resolve, reject) => {
            server.serverOnOpenResolve = resolve;
        });
    }

    join(channelName, stream) {
        if (!(channelName in this.channelsByName)) {
            this.streamByChannelName[channelName] = stream;
            this.send({ command: "Join Channel", message: `JOIN #${channelName}` });
        } else {
            console.log('Already joined channel', channelName);
        }
    }

    part(channelName) {
        if (channelName in this.channelsByName) {
            return this.channelsByName[channelName].writeFile()
                .then(() => this.send({ command: "Depart Channel", message: `PART #${channelName}` }));
        } else {
            console.log('Cannot leave channel you havent joined', channelName);
        }
    }

    onMessage(message) {
        if (message !== null) {
            const parsed = this.parseMessage(message.data);
            if (parsed.command === "PRIVMSG") {
                //> @badges=<badges>;color=<color>;display-name=<display-name>;emotes=<emotes>;id=<id-of-msg>;mod=<mod>;room-id=<room-id>;subscriber=<subscriber>;tmi-sent-ts=<timestamp>;turbo=<turbo>;user-id=<user-id>;user-type=<user-type> :<user>!<user>@<user>..... PRIVMSG #<channel> :<message>
                if (parsed.channel in this.channelsByName) {
                    const channel = this.channelsByName[parsed.channel];
                    channel.onMessage(parsed);
                }
            } else if (parsed.command === "CLEARCHAT") {
                // @ban-duration=<ban-duration> :<host> CLEARCHAT #<channel> :<user>
            } else if (parsed.command === "CLEARMSG") {
                //> @login=<login>;target-msg-id=<target-msg-id> :<host> CLEARMSG #<channel> :<message>
            } else if (parsed.command === "MODE") {
                // :<host> MODE #<channel> +o <user>\r\n
            } else if (parsed.command === "CAP") {
                //:<host> CAP * ACK :./tags ./commands ./membership\r\n'
            } else if (parsed.command === "PART") {
                const channelName = parsed.channel;
                delete this.channelsByName[channelName];
                console.log('>  IRC', `PART channel '${channelName}'`);
            } else if (parsed.command === "JOIN") {
                const channelName = parsed.channel;
                const stream = this.streamByChannelName[channelName];
                this.channelsByName[channelName] = new Channel(channelName, stream);
                delete this.streamByChannelName[channelName];
            } else if (parsed.command === "USERSTATE") {
                //> @badges=<badges>;color=<color>;display-name=<display-name>;emote-sets=<emotes>;mod=<mod>;subscriber=<subscriber>;turbo=<turbo>;user-type=<user-type> :<host> USERSTATE #<channel>
            } else if (parsed.command === "GLOBALUSERSTATE") {
                //> @badges=<badges>;color=<color>;display-name=<display-name>;emote-sets=<emote-sets>;turbo=<turbo>;user-id=<user-id>;user-type=<user-type> :<host> GLOBALUSERSTATE
            } else if (parsed.command === "ROOMSTATE") {
                //> @broadcaster-lang=<broadcaster-lang>;emote-only=<emote-only>;followers-only=<followers-only>;r9k=<r9k>;slow=<slow>;subs-only=<subs-only> :<host> ROOMSTATE #<channel>
            } else if (parsed.command === "001") {
                /*  :<host> 001 <user> :-\r\n:<host> 002 <user> :-<host>\r\n:<host> 003 <user> :-\r\n:<host> 004 <user> :-\r\n
                    :<host> 375 <user> :-\r\n:<host> 372 <user> :-\r\n:<host> 376 <user> :>\r\n*/
            } else if (parsed.command === "353") {
                // :<user>.<host> 353 <user> = #<channel> :<channel>\r\n
                // :<user>.<host> 353 <user> = #<channel> :<user>\r\n
                // :<user>.<host> 366 <user> #<channel> :End of /NAMES list\r\n
                // :<host> MODE #<channel> +o <channel>\r\n
            } else if (parsed.command === "USERNOTICE") {
                //> @badges=<badges>;color=<color>;display-name=<display-name>;emotes=<emotes>;id=<id-of-msg>;login=<user>;mod=<mod>;msg-id=<msg-id>;room-id=<room-id>;subscriber=<subscriber>;system-msg=<system-msg>;tmi-sent-ts=<timestamp>;turbo=<turbo>;user-id=<user-id>;user-type=<user-type> :<host> USERNOTICE #<channel> :<message>
            } else if (parsed.command === "PING") {
                this.send({ command: 'Connection Keep Alive', message: `PONG :${parsed.message}` });
            } else {
                console.log('>>>!', parsed.command, message.data);
            }
        }
    }

    parseMessage(rawMessage) {
        const parsedMessage = {
            message: null,
            tags: {},
            command: null,
            channel: null,
            username: null
        };

        if (rawMessage.startsWith("PING")) {
            return { command: "PING", message: rawMessage.split(':')[1].replace(/\r\n/g, '') };
        }

        const tagID = '@',
            prefixID = ':',
            channelID = '#';

        const parts = rawMessage.replace(/\r\n/g, '').split(' ');
        if (rawMessage[0] === tagID) {
            const tags = parts.shift().slice(1).split(';');
            tags.forEach(t => {
                const keyValue = t.split('=');
                parsedMessage.tags[keyValue[0]] = keyValue[1];
            });
        }

        if (parts.length && parts[0][0] === prefixID) {
            const prefix = parts.shift();
            const userID = '!',
                userIndex = prefix.indexOf(userID);
            if (userIndex > -1) {
                parsedMessage.username = prefix.slice(1, userIndex);
            }
        }

        if (parts.length) parsedMessage.command = parts.shift();

        if (parts.length && parts[0][0] === channelID) {
            const channel = parts.shift();
            parsedMessage.channel = channel.slice(1);
        }

        parsedMessage.message = parts.join(' ').slice(1);
        return parsedMessage;
    }

    onOpen() {
        const socket = this.webSocket;
        if (socket !== null && socket.readyState === 1) {
            if (config.irc.capability_negotiation.length) {
                const cap_req = config.irc.capability_negotiation.join(' ');
                this.send({ command: "Capability Negotiation", message: `CAP REQ :${cap_req}` });
            }
            this.send({ command: "Set Password", message: `PASS ${this.password}` });
            this.send({ command: "Set Nickname", message: `NICK ${this.username}` });
            this.serverOnOpenResolve();
        }
    }

    send(message) {
        const socket = this.webSocket;
        if (socket !== null && socket.readyState === 1) {
            console.log('<  IRC', message.command, message.command == "Set Password" ? 'PASS oauth:********' : message.message);
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