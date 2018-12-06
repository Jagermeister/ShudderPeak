const request = require('request');
const fs = require('fs');
const config = require('./config.json');
const ffmeg = require('fluent-ffmpeg');

const options = (() => {
    const arguments = process.argv.slice(2);
    const parameters = {};
    arguments.forEach(a => {
        const keyValue = a.split('=');
        parameters[keyValue[0]] = keyValue.length > 1 ? keyValue[1] : true;
    })
    return parameters;
})();

const videoId = options.video;
const partDownloadDelay = 20000;

new Promise((resolve, reject) =>
    fs.readFile('./highlight_' + videoId + '.json', (err, data) =>
        err ? reject(err) : resolve(JSON.parse(data).highlights)
)).then((highlights =>
    highlights.forEach((h, i) =>
        setTimeout(() => download(videoId, h.start, h.end), i * partDownloadDelay))));

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
            var bundleTsName = `${videoId}_${startTime}_${endTime}.ts`;
            fs.createWriteStream(bundleTsName);
            for (var slice of videoSlices) {
                var sliceFile = slice + '.ts',
                    fileSaveName = `${videoId}_${sliceFile}`
                sliceFiles.push(fileSaveName);
                downloads.push(new Promise(resolve => {
                    request.get(videoUrl + '/' + sliceFile)
                        .pipe(fs.createWriteStream(fileSaveName)).on('finish', _ => {
                            console.log('download of ' + fileSaveName + ' finished')
                            resolve();
                        });
                }));
            }
            Promise.all(downloads)
                .then(_ => {
                    console.log(`Video ${videoId} for clips ${startTime} => ${endTime} download done !`);
                    concatFiles(sliceFiles, bundleTsName);
                    ffmeg().addInput(bundleTsName).output(`${videoId}_${startTime}_${endTime}.mp4`).run();
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
    for (var i = startBound; i < endBound + 1; i++) {
        range.push(i + 1);
    }
    return range;
}

async function concatFiles(files, output) {
    for (var file of files) {
        var w = fs.createWriteStream(output, { flags: 'a' });
        await concatFile(file, w);
    }
}
async function concatFile(file, outputStream) {
    return new Promise(resolve => {
        fs.createReadStream(file).pipe(outputStream);
        outputStream.on('finish', resolve);
    })
}