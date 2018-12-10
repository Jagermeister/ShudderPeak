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
    const server = new IRCServer({
        username: token.username,
        password: 'oauth:' + token.access_token,
    });

    const channelName = '#nl_kripp';

    server.open()
        .then(() => {
            server.join(channelName);
            setInterval(() => {
                fs.writeFile(
                    `test_${channelName}.json`,
                    JSON.stringify(server.channelsByName[channelName].stats.data),
                    (err) => {
                        if (err) throw err;
                        console.log('The file has been saved!');
                    }
                );
            }, 60000);
        });
})