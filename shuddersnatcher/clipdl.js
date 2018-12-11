const child_process = require('child_process');
const fs = require('fs');
const request = require('request');
const path = require('path');
const rimraf = require('rimraf');
const config = require('./config.json');

const options = (() => {
  const arguments = process.argv.slice(2);
  const parameters = {};
  arguments.forEach(a => {
    const keyValue = a.split('=');
    parameters[keyValue[0]] = keyValue.length > 1 ? keyValue[1] : true;
  });
  return parameters;
})();

const videoId = options.video;

new Promise((resolve, reject) =>
  fs.readFile('./highlight_' + videoId + '.json', (err, data) => (err ? reject(err) : resolve(JSON.parse(data).highlights)))
).then(highlights => {
  console.log(`0. Requesting ${highlights.length} highlights from video ${videoId}`);
  getSliceDownloadUrl(videoId).then(videoUrl => {
    request(videoUrl, { json: true, rejectUnauthorized: false }, (err, _, body) => {
      if (err) {
        return console.log(err);
      }
      var videoUrl = getVideoEndpoint(body);
      var i = 0;
      for (var h of highlights) {
        try {
          download(videoUrl, videoId, h.start, h.end, i++);
        } catch (err) {
          console.log(`error -> ${err}`);
        }
      }
    });
  });
});

function getSliceDownloadUrl(videoId) {
  return new Promise((resolve, reject) => {
    var tokenUrl = config.tokenUrlTemplate.replace('{video_id}', videoId).replace('{client_id}', config.clientId);
    request(tokenUrl, { json: true }, (err, _, body) => {
      if (err) {
        reject(err);
      }
      var sig = body.sig;
      var videoUrl = config.tokenUrlVideoTemplate
        .replace('{video_id}', videoId)
        .replace('{sig}', sig)
        .replace('{vod_token}', body.token);
      resolve(encodeURI(videoUrl));
    });
  });
}

function download(videoUrl, videoId, startTime, endTime, hIndex) {
  return new Promise(resolve => {
    var videoSlices = getRangeToDownload(startTime, endTime);

    var downloadSlices = new Promise((resolve, reject) => {
      var sliceDls = [];
      for (var slice of videoSlices) {
        console.log(`1. Downloading ${videoId}, ${startTime}:${endTime}`);
        sliceDls.push(
          new Promise((res, rej) => {
            if (!fs.existsSync(__dirname + '/' + hIndex)) {
              fs.mkdirSync(__dirname + '/' + hIndex);
            }
            var sliceFile = slice + '.ts',
              fileSaveName = `${hIndex}/${videoId}_${sliceFile}`;
            request
              .get(videoUrl + '/' + sliceFile)
              .pipe(fs.createWriteStream(fileSaveName))
              .on('finish', () => {
                console.log('\tdownloading ' + fileSaveName + ' completed');
                res(fileSaveName);
              })
              .on('error', () => {
                console.log('\tdowloading ' + fileSaveName + ' failed');
                rej(fileSaveName);
              });
          })
        );
      }
      Promise.all(sliceDls)
        .then(files => resolve(files))
        .catch(() => reject());
    });
    downloadSlices
      .then(async files => {
        console.log(`2. Bundling clips into ${videoId}_${startTime}_${endTime}.ts`);
        console.time(`2. Bundling clips into ${videoId}_${startTime}_${endTime}.ts completed`);
        var bundleTsName = `${videoId}_${startTime}_${endTime}.ts`;
        await concatFiles(files, bundleTsName);
        if (files && files.length > 0) {
          rimraf.sync(path.dirname(files[0]));
        }
        console.timeEnd(`2. Bundling clips into ${videoId}_${startTime}_${endTime}.ts completed`);
        console.log(`3. Converting ${videoId}_${startTime}_${endTime}.ts into ${videoId}_${startTime}_${endTime}.mp4`);
        console.time(`3. Converting ${videoId}_${startTime}_${endTime}.ts into ${videoId}_${startTime}_${endTime}.mp4 completed`);
        try {
          convertToMp4(videoId, startTime, endTime);
          console.timeEnd(`3. Converting ${videoId}_${startTime}_${endTime}.ts into ${videoId}_${startTime}_${endTime}.mp4 completed`);
          fs.unlinkSync(bundleTsName);
        } catch (e) {
          console.log(e);
        }
        resolve();
      })
      .catch(error => {
        console.log('/!\\ Error on download for the file: ' + error);
        if (error && error.length > 0) {
          rimraf.sync(path.dirname(error[0]));
        }
      });
  });
}

function convertToMp4(videoId, startTime, endTime) {
  var inputFilename = `${videoId}_${startTime}_${endTime}.ts`;
  var outputFilename = `${videoId}_${startTime}_${endTime}.mp4`;
  try {
    child_process.execSync(`ffmpeg -hide_banner -loglevel quiet -i ${inputFilename} -acodec copy -vcodec copy -y ${outputFilename}`);
  } catch (e) {
    if (fs.existsSync(__dirname + '/' + inputFilename)) {
      fs.renameSync(__dirname + '/' + inputFilename, __dirname + '/error/' + inputFilename);
    }
    if (fs.existsSync(__dirname + '/' + outputFilename)) {
      fs.renameSync(__dirname + '/' + outputFilename, __dirname + '/error/' + outputFilename);
    }
    console.log('/!\\ Error on ffmpeg .ts to .mp4, move file to the error folder');
    throw new Error(e);
  }
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

function concatFiles(files, output) {
  return new Promise(async resolve => {
    for (var file of files) {
      var w = fs.createWriteStream(output, { flags: 'a' });
      await concatFile(file, w);
    }
    resolve();
  });
}
async function concatFile(file, outputStream) {
  return new Promise(resolve => {
    fs.createReadStream(file).pipe(outputStream);
    outputStream.on('finish', resolve);
  });
}
