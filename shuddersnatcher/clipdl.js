const child_process = require('child_process');
const fs = require('fs');
const request = require('request');

const config = require('./config.json');

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

new Promise((resolve, reject) =>
    fs.readFile('./highlight_' + videoId + '.json', (err, data) =>
        err ? reject(err) : resolve(JSON.parse(data).highlights)
    )).then(async highlights => {
        console.log(`0. Requesting ${highlights.length} highlights from video ${videoId}`);
        for (var h of highlights) {
            try {
                await download(videoId, h.start, h.end);
            } catch (err) {
                console.log(`error -> ${err}`)
            }
        }
    });

function download(videoId, startTime, endTime) {
    return new Promise((resolve, reject) => {
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
                console.log(`1. Downloading ${videoId}, ${startTime}:${endTime}`);
                console.time(`1. Downloading ${videoId}, ${startTime}:${endTime} completed`);
                fs.createWriteStream(bundleTsName);
                for (var slice of videoSlices) {
                    var sliceFile = slice + '.ts',
                        fileSaveName = `${videoId}_${sliceFile}`
                    sliceFiles.push(fileSaveName);
                    downloads.push(new Promise(resolve => {
                        var file = fileSaveName;
                        request.get(videoUrl + '/' + sliceFile)
                            .pipe(fs.createWriteStream(file)).on('finish', _ => {
                                console.log('     downloading ' + file + ' completed')
                                resolve();
                            });
                    }));
                }

                Promise.all(downloads)
                    .then(async _ => {
                        console.timeEnd(`1. Downloading ${videoId}, ${startTime}:${endTime} completed`);
                        console.log(`2. Bundling clips into ${videoId}_${startTime}_${endTime}.ts`);
                        console.time(`2. Bundling clips into ${videoId}_${startTime}_${endTime}.ts completed`)
                        await concatFiles(sliceFiles, bundleTsName);
                        sliceFiles.forEach(s => fs.unlinkSync(s));
                        console.timeEnd(`2. Bundling clips into ${videoId}_${startTime}_${endTime}.ts completed`)
                        console.log(`3. Converting ${videoId}_${startTime}_${endTime}.ts into ${videoId}_${startTime}_${endTime}.mp4`);
                        console.time(`3. Converting ${videoId}_${startTime}_${endTime}.ts into ${videoId}_${startTime}_${endTime}.mp4 completed`)
                        await convertToMp4(videoId, startTime, endTime, bundleTsName);
                        fs.unlinkSync(bundleTsName);
                        console.timeEnd(`3. Converting ${videoId}_${startTime}_${endTime}.ts into ${videoId}_${startTime}_${endTime}.mp4 completed`)
                        resolve();
                    }).catch(error => {
                        console.log(error);
                        fs.unlinkSync(bundleTsName);
                        reject();
                    });
            });
        });
    });
};

function convertToMp4(videoId, startTime, endTime, inputFile) {
    return new Promise((resolve, reject) => {
        child_process.execSync(`ffmpeg -hide_banner -loglevel panic -i ${videoId}_${startTime}_${endTime}.ts -acodec copy -vcodec copy -y ${videoId}_${startTime}_${endTime}.mp4`);
        /* ffmpeg: handling video, audio, and other multimedia files and streams
         *  -hide_banner    Suppress printing banner
         *  -loglevel panic Only show fatal errors
         *  -i              Input File
         *  -acodec         Set the audio codec
         *  -vcodec         Set the video codec
         *  -y              Overwrite output files without asking
         *                  Output file
        */
        resolve();
    });
}

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
