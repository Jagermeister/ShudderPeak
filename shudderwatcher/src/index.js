const fs = require('fs');
const chalk = require('chalk');

const authenticate = require('./OAuth2.js');
const api = require('./api.js');
const IRC = require('./irc/server.js');

let ircServer;

const SCOPES = [
    'chat:read',
    'chat:edit',
    'channel:moderate',
    'whispers:read',
    'whispers:edit'
];

authenticate(SCOPES).then((token) => {
    return new IRC({
        username: token.username,
        password: 'oauth:' + token.access_token,
    });
}).then((server) => {
    ircServer = server;
    ircServer.open().then(() => channelsFetch()
        .then((streams) => streams.forEach((stream, i) => setTimeout(() => ircServer.join('#'+stream.channel.name), i * 2000)))
    );
})


function channelsFetch() {
    return new Promise((resolve, reject) => {
        fs.readFile('./config.json', (err, data) => err ? reject(err) : resolve(JSON.parse(data).streamPreference))
    }).then(filter => api.channelsByViewers()
        .then(streams => {
            const channelCountMax = 5;
            const channels = [];
            for (let i = 0, l = streams.length; i < l; i++) {
                if (channels.length == channelCountMax) {
                    break;
                }

                const stream = streams[i];
                if (filter.gamesFavored.includes(stream.game)) {
                    channels.push(stream);
                }
            }

            return channels;
        })
    )
}