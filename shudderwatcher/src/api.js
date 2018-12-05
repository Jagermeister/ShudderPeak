const request = require('request');
const fs = require('fs');
const config = require('./config.json');

const filter = config.streamPreference;
const viewerMinimumCountDefault = 4000;
const viewerMinimumCount = filter.viewerMinimum ? filter.viewerMinimum : viewerMinimumCountDefault;

const api = {};
api.channelsByViewers = function() {
    return new Promise((resolve, reject) => {
        fs.readFile('client_secret.json', (err, data) => err ? reject(err) : resolve(JSON.parse(data)));
    }).then(token => new Promise((resolve, reject) => {
        const endpoint = 'streams/'
        const parameters = {
            'limit': '50',
            'language': 'en',
            'client_id': token.client_id
        };
        request.get(
            `${config.endpoint}${endpoint}?${dictToString(parameters)}`,
            (err, _, body) => err ? reject(err) : resolve(JSON.parse(body).streams)
        );
    })).then(streams => streams.map(s => { return {
            _id: s._id,
            viewers: s.viewers,
            created: new Date(s.created_at).getTime(),
            game: s.game.replace(/[^a-z0-9]/gi, '_'),
            channel: {
                _id: s.channel._id,
                name: s.channel.name,
                views: s.channel.views,
                followers: s.channel.followers
            }}
        }).filter(s => s.viewers > viewerMinimumCount)
    ).then(streams => streams.filter(s =>
        !(filter.gamesDisallowed.includes(s.game) || filter.streamersDisallowed.includes(s.channel.name)))
    );
}

api.channelsStatusByName = function (channelNames) {
    return new Promise((resolve, reject) => {
        fs.readFile('client_secret.json', (err, data) => err ? reject(err) : resolve(JSON.parse(data)));
    }).then(token => new Promise((resolve, reject) => {
        if (channelNames.length > 0) {
            const endpoint = 'streams/'
            const parameters = {
                'channel': channelNames.join(','),
                'client_id': token.client_id
            };
            request.get(
                `${config.endpoint}${endpoint}?${dictToString(parameters)}`,
                (err, _, body) => err ? reject(err) : resolve(JSON.parse(body).streams)
            );
        } else {
            resolve([]);
        }
    })).then(streams => streams.map(s => {
        return {
            channel: s.channel.name,
            viewers: s.viewers,
            created: s.created_at
    }}));
};

function dictToString(dict) {
    return Object.keys(dict).map(k => `${k}=${dict[k]}`).join('&');
}

module.exports = api;