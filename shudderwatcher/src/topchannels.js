const request = require('request');
const fs = require('fs');
const config = require('./config.json');

const viewerMinimumCount = 4000;

new Promise((resolve, reject) => {
    fs.readFile('client_secret.json', (err, data) => {
        err ? reject(err) : resolve(JSON.parse(data));
    });
}).then(token => {
    return new Promise((resolve, reject) => {
        const endpoint = 'streams/'
        const parameters = {
            'limit': '50',
            'language': 'en',
            'client_id': token.client_id
        };
        request.get(
            `${config.endpoint}${endpoint}?${dictToString(parameters)}`,
            (err, _, body) => {
                err ? reject(err) : resolve(JSON.parse(body).streams);
            }
        );
    });
}).then(streams => {
    return new Promise((resolve, reject) => {
        resolve(streams.map(s => {
                return {
                    _id: s._id,
                    viewers: s.viewers,
                    created: s.created_at,
                    game: s.game,
                    channel: {
                        _id: s.channel._id,
                        name: s.channel.name,
                        views: s.channel.views,
                        followers: s.channel.followers
                    }
                }
            }).filter(s => s.viewers > viewerMinimumCount)
        );
    });
}).then(streams => {
    streams.forEach(s => {
        console.log(('000000'+s.viewers).slice(-6), `[${s.game}]`, `${s.channel.name} (${s.channel._id})`)
    });
});

function dictToString(dict) {
    return Object.keys(dict).map(k => `${k}=${dict[k]}`).join('&');
}