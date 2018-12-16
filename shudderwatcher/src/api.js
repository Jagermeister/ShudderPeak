const request = require('request');
const fs = require('fs');
const config = require('./config.json');

const filter = config.streamPreference;
const viewerMinimumCountDefault = 4000;
const viewerMinimumCount = filter.viewerMinimum ? filter.viewerMinimum : viewerMinimumCountDefault;

const api = {};
api.channelsByViewers = function() {
    return fetchToken().then(token => new Promise((resolve, reject) => {
        const endpoint = 'streams/';
        const parameters = {
            'limit': '50',
            'language': 'en',
            'client_id': token.client_id
        };
        request.get(
            `${config.endpoint}${endpoint}?${dictToString(parameters)}`,
            (e, r, b) => parseJSONPromise(e, r, b, resolve, reject)
        );
    })).then(response => {
            const streams = response.streams;
            return streams.map(s => { return {
            _id: s._id,
            viewers: s.viewers,
            created: new Date(s.created_at).getTime(),
            game: s.game.replace(/[^a-z0-9]/gi, '_'),
            channel: {
                _id: s.channel._id,
                name: s.channel.name,
                views: s.channel.views,
                followers: s.channel.followers
            }};
        }).filter(s => s.viewers > viewerMinimumCount)
    }).then(streams => streams.filter(s =>
        !(filter.gamesDisallowed.includes(s.game) || filter.streamersDisallowed.includes(s.channel.name)))
    ).catch(err => console.log('/!\\ API.channelsByViewers unable to process response.', err));
};

api.channelsStatusByName = function (channelNames) {
    return fetchToken().then(token => new Promise((resolve, reject) => {
        if (channelNames.length > 0) {
            const endpoint = 'streams/';
            const parameters = {
                'channel': channelNames.join(','),
                'client_id': token.client_id
            };
            request.get(
                `${config.endpoint}${endpoint}?${dictToString(parameters)}`,
                (e, r, b) => parseJSONPromise(e, r, b, resolve, reject)
            );
        } else {
            resolve({'streams': []});
        }
    })).then(response => {
        const streams = response.streams;
        return streams.map(s => {
            return {
                channel: s.channel.name,
                viewers: s.viewers,
                created: s.created_at
        }});
    }).catch(err => console.log('/!\\ API.channelsStatusByName unable to process response.', err));
};

api.channelLiveVideo = function(channelName) {
    return fetchToken().then(token => new Promise((resolve, reject) => {
        const endpoint = `channels/${channelName}/videos`;
        const parameters = {
            'limit': 1,
            'broadcast_type': 'archive',
            'client_id': token.client_id
        };
        request.get(
            `${config.endpoint}${endpoint}?${dictToString(parameters)}`,
            (e, r, b) => parseJSONPromise(e, r, b, resolve, reject)
        );
    })).then(response => new Promise((resolve, reject) => {
        const videos = response.videos;
        if (videos.length === 1) {
            const video = videos[0];
            if (video.status === 'recording') resolve(video);
        }

        reject();
    })).catch(err => console.log('/!\\ API.channelLiveVideo unable to process response.', err));
};

function fetchToken() {
    return new Promise((resolve, reject) => fs.readFile('client_secret.json', (err, data) => err ? reject(err) : resolve(JSON.parse(data))));
}

function dictToString(dict) {
    return Object.keys(dict).map(k => `${k}=${dict[k]}`).join('&');
}

function parseJSONPromise(error, response, body, resolve, reject) {
    if (error) {
        reject(error);
    } else {
        try {
            resolve(JSON.parse(body));
        } catch (e) {
            reject(e);
        }
    }
}

module.exports = api;