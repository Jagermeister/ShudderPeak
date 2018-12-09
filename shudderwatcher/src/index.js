const fs = require('fs');
const chalk = require('chalk');

const authenticate = require('./OAuth2.js');
const api = require('./api.js');
const IRC = require('./irc/server.js');

let ircServer;
const channelCountMax = 6;
const channelReviewIntervalMS = 60000;

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
    console.log('1. Connecting to IRC Server');
    ircServer = server;
    return ircServer.open();
}).then(() => {
    setInterval(() => {
        removeDeadChannels()
            .then(() => new Promise((resolve, reject) => {
                const channels = Object.keys(ircServer.channelsByName);
                const newChannels = channelCountMax - channels.length;
                resolve(newChannels > 0 ? channelsFetch(newChannels) : []);
            }))
            .then((streams) => streams.forEach((stream, i) => setTimeout(() => {
                const channelName = stream.channel.name;
                api.channelLiveVideo(channelName)
                    .then(video => ircServer.join(stream.channel.name, Object.assign({},
                        stream, {
                            'video': {
                                '_id': video._id,
                                'created_at': video.created_at
                        }})))
                    .catch(() => console.log(`/!\\ 3.1 Could not find video id for channel '${channelName}'`));
            }, i * 2000)));
    }, channelReviewIntervalMS);
});

function channelsFetch(channelCount) {
    return new Promise((resolve, reject) =>
        fs.readFile('./config.json', (err, data) => err ? reject(err) : resolve(JSON.parse(data).streamPreference))
    ).then(filter => api.channelsByViewers()
        .then(streams => {
            console.log(`3. Fetching new channels... need ${channelCount} from ${streams.length}`);
            const serverChannels = Object.keys(ircServer.channelsByName);
            const channels = [];
            for (let i = 0, l = streams.length; i < l; i++) {
                if (channels.length == channelCount) {
                    break;
                }

                const stream = streams[i];
                if (filter.gamesFavored.includes(stream.game) && !serverChannels.includes(stream.channel.name)) {
                    channels.push(stream);
                }
            }

            console.log(`3.   Found ${channels.length} channels`);
            return channels;
        })
    );
}

function removeDeadChannels() {
    /**
     * Check channel status from API request
     * Dead channel means move log file
     */
    const serverChannels = Object.keys(ircServer.channelsByName);
    return api.channelsStatusByName(serverChannels)
        .then((channels) => {
            const channelNames = channels.map(c => c.channel);
            console.log(`2. Checking for dead channels.. ${serverChannels.length - channelNames.length} found.`);
            serverChannels.forEach(c => {
                if (!channelNames.includes(c)) {
                    const channel = ircServer.channelsByName[c];
                    const filename = channel.filename();
                    ircServer.part(c)
                        .then(() => fs.rename(filename, `../data/highlight/${filename}`));
                }
            });
        });
}