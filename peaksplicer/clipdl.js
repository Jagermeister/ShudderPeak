const config = require('./config.json');
var request = require('request');
var querystring = require('querystring');
var fs = require('fs');
var https = require('https')

download('341159577', null, null);

function download(videoId, startTime, endTime) {
  var tokenUrl = config.tokenUrlTemplate
  .replace('{video_id}', videoId)
  .replace('{client_id}', config.clientId);
  request(tokenUrl, { json: true }, (err, _, body) => {
    if(err) {
      return console.log(err);
    }
    var sig = body.sig;
    var videoUrl = config.tokenUrlVideoTemplate
      .replace('{video_id}', videoId)
      .replace('{sig}', sig)
      .replace('{vod_token}', body.token);
      videoUrl =  encodeURI(videoUrl);

    request(videoUrl, { json: true, rejectUnauthorized:false}, (err, _, body) => {
      if(err) {
        return console.log(err);
      }
      var videoUrl = getVideoEndpoint(body);
      var file = fs.createWriteStream('1.ts');
      https.get(videoUrl + '/1.ts', function(response) {
        response.pipe(file);
      });
    });
  });
};

function getVideoEndpoint(body) {
  var lines = body.split('\n');
  for(var line of lines) {
    if(line.startsWith('http')) {
        return line.substring(0, line.lastIndexOf('/'));
    }
  }
  return '';
}
