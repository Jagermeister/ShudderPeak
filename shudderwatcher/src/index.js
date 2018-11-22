const authenticate = require('./OAuth2.js');
const config = require('./config.json');

const SCOPES = [
    'chat:read',
    'chat:edit',
    'channel:moderate',
    'whispers:read',
    'whispers:edit'
];


const credentials = authenticate(SCOPES)

const IRCServer = require('./IRCClient.js');
credentials.then((token) => {
    const twitch = new IRCServer({
        username: token.username,
        password: 'oauth:' + token.access_token,
        channel: '#'+config.irc.channel_defaults,
    })

    twitch.open();
})