const authenticate = require('./OAuth2.js');
const IRCServer = require('./irc/server.js');
const fs = require('fs');

const SCOPES = [
    'chat:read',
    'chat:edit',
    'channel:moderate',
    'whispers:read',
    'whispers:edit'
];

const credentials = authenticate(SCOPES);
credentials.then((token) => {
    const twitch = new IRCServer({
        username: token.username,
        password: 'oauth:' + token.access_token,
    });

    const channelName = '#nl_kripp';

    twitch.open()
        .then(() => {
            twitch.join(channelName);
            setInterval(() => {
                fs.writeFile(
                    'nl_kripp_3.json',
                    JSON.stringify(twitch.channelsByName[channelName].stats.data),
                    (err) => {
                        if (err) throw err;
                        console.log('The file has been saved!');
                    }
                );
            }, 60000);
        });
})