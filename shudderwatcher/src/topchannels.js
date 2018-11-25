const request = require('request');
const fs = require('fs');
const config = require('./config.json');
const chalk = require('chalk');

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
    const bgColors = [
        chalk.bgBlack.white.bold,
        chalk.bgRed.blue,
        chalk.bgGreen.black,
        chalk.bgYellow.black,
        chalk.bgBlue.white,
        chalk.bgMagenta.black,
        chalk.bgCyan.black,
        chalk.bgWhite.black,
        chalk.bgBlackBright.black,
        chalk.bgRedBright.black,
        chalk.bgGreenBright.black,
        chalk.bgYellowBright.black,
        chalk.bgBlueBright.black,
        chalk.bgMagentaBright.black,
        chalk.bgCyanBright.black,
        chalk.bgWhiteBright.black
    ];
    const bold = chalk.bold;
    const colorByGame = {};
    const statsByGame = {};

    const maxGameCharacters = Math.max(...streams.map(s => s.game.length));
    const gameTitle = 'GAME NAME';
    console.log(bold('Viewer'), bold(`[${gameTitle}]`), bold(' '.repeat(maxGameCharacters - gameTitle.length)), bold('Streamer'), bold('(Channel Id)'));
    streams.forEach(s => {
        let gameStyle = (g) => g;
        if (!(s.game in colorByGame) && bgColors.length) {
            colorByGame[s.game] = bgColors.shift();
        }

        if (s.game in colorByGame) {
            gameStyle = (g) => colorByGame[s.game](g);
        }

        statsByGame[s.game] = statsByGame[s.game] || { viewers: 0, streamers: 0 };
        statsByGame[s.game].viewers += s.viewers;
        statsByGame[s.game].streamers++;
        console.log(('000000'+s.viewers).slice(-6), `[${gameStyle(s.game)}]`, ' '.repeat(maxGameCharacters - s.game.length), `${s.channel.name} (${s.channel._id})`)
    });
    const streamCount = streams.length;
    const viewerSum = streams.map(s => s.viewers).reduce((p, c) => p + c, 0);
    console.log('------', '------')
    console.log(('000000'+viewerSum).slice(-6), `${streamCount} streamers`);
    console.log();
    console.log(bold('Viewer'), bold('Streamer'), bold(`[${gameTitle}]`));
    Object.keys(statsByGame).forEach(k => {
        const gameName = k;
        const stats = statsByGame[k];
        let gameStyle = (g) => g;
        if (gameName in colorByGame) {
            gameStyle = (g) => colorByGame[gameName](g);
        }

        console.log(('000000'+stats.viewers).slice(-6), ('00'+stats.streamers).slice(-2), `\t[${gameStyle(gameName)}]`);
    });
});

function dictToString(dict) {
    return Object.keys(dict).map(k => `${k}=${dict[k]}`).join('&');
}
