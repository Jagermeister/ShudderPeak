const request = require('request');
const fs = require('fs');
const config = require('./config.json');
const ffmeg = require('fluent-ffmpeg');
const concat = require('concat');
const process = require('child_process');

download('341159577', 9, 27);

function download(videoId, startTime, endTime) {
    var tokenUrl = config.tokenUrlTemplate
        .replace('{video_id}', videoId)
        .replace('{client_id}', config.clientId);
    request(tokenUrl, { json: true }, (err, _, body) => {
        if (err) {
            return console.log(err);
        }
        var sig = body.sig;
        var videoUrl = config.tokenUrlVideoTemplate
            .replace('{video_id}', videoId)
            .replace('{sig}', sig)
            .replace('{vod_token}', body.token);
        videoUrl = encodeURI(videoUrl);

        request(videoUrl, { json: true, rejectUnauthorized: false }, (err, _, body) => {
            if (err) {
                return console.log(err);
            }
            var videoUrl = getVideoEndpoint(body);
            var videoSlices = getRangeToDownload(startTime, endTime);
            var sliceFiles = [];
            var downloads = [];
            var bundleTsName = 'bundle.ts';
            fs.createWriteStream(bundleTsName);
            for(var slice of videoSlices) {
                var sliceFile = slice + '.ts';
                sliceFiles.push(sliceFile);
                downloads.push(new Promise(resolve => {
                    var file = sliceFile;
                    request.get(videoUrl + '/' + file)
                .pipe(fs.createWriteStream(file)).on('finish', _ => {
                    console.log('download of ' + file + ' finished')
                    resolve();
                });
            }));
        }
        Promise.all(downloads)
            .then(_ => {
                console.log('all download done !');
                process.execSync('cat ' + sliceFiles.join(' ') + ' > ' + bundleTsName);
                ffmeg().addInput(bundleTsName).output('bundle.mp4').run();
            }).catch(error => console.log(error));
        });
    });
};

function getVideoEndpoint(body) {
    var lines = body.split('\n');
    for (var line of lines) {
        if (line.startsWith('http')) {
            return line.substring(0, line.lastIndexOf('/'));
        }
    }
    return '';
}
function getRangeToDownload(start, end) {
    var range = [];
    var startBound = Math.trunc(start / 10);
    var endBound = Math.trunc(end / 10);
    for(var i = startBound; i < endBound + 1; i ++) {
        range.push(i + 1);
    }
    return range;
}