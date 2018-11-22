const tmi = require('tmi.js');
const authenticate = require('./OAuth2.js');
var fs = require('fs');

const { username, a, b, access_token } = JSON.parse(fs.readFileSync('client_secret.json', 'utf8'));
const twitch = new IRCServer({
    username: username,
    password: 'oauth:' + access_token,
    channel: '#admiralbulldog',
})

console.log(twitch)

twitch.open();

/*
Real authentication not available for irc chat
const SCOPES = [
    'chat:read',
    'chat:edit',
    'channel:moderate',
    'whispers:read',
    'whispers:edit'
];

const OAuthToken = authenticate(SCOPES);

const IRCServer = require('./IRCClient.js');

OAuthToken.then((token) => {
    
});
*/
return
OAuthToken.then((token) => {
    const opts = {
        headers: {
            "Accept": "application/vnd.twitchtv.v3+json",
            'Authorization': 'OAuth  ' + token.access_token,
            'Client-ID': client_id
        },
        options: {
            debug: true
        },
        identity: {
            username: username,
            password: 'oauth:' + token.access_token
        },
        channels: [
            '#nl_kripp'
        ]
    };

    console.log(opts);

    let client = new tmi.client(opts)
    client.on('message', onMessageHandler)
    client.on('connected', onConnectedHandler)
    client.on('disconnected', onDisconnectedHandler)
    client.connect()
});



function onMessageHandler (target, context, msg, self) {
    if (self) { return } // Ignore messages from the bot
    console.log(`[${target} (${context['message-type']})] ${context.username}: ${msg}`)
}

function onConnectedHandler (addr, port) {
    console.log(`* Connected to ${addr}:${port}`)
}

function onDisconnectedHandler (reason) {
    console.log(`Disconnected: ${reason}`)
    process.exit(1)
}