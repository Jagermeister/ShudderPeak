const authenticate = require('./OAuth2.js');
const IRCServer = require('./irc/server.js');
const config = require('./config.json');

const SCOPES = [
    'chat:read',
    'chat:edit',
    'channel:moderate',
    'whispers:read',
    'whispers:edit'
];

const credentials = authenticate(SCOPES)
credentials.then((token) => {
    const twitch = new IRCServer({
        username: token.username,
        password: 'oauth:' + token.access_token,
        channel: '#'+config.irc.channel_defaults,
    })

    twitch.open();
})