var { google } = require('googleapis');
var authenticate = require('./OAuth2.js');


// https://developers.google.com/youtube/v3/getting-started#quota
// https://developers.google.com/identity/protocols/googlescopes#youtubev3

var SCOPES = ['https://www.googleapis.com/auth/youtube.readonly'];

authenticate(SCOPES).then((auth) => getChannel(auth));


/**
 * Lists the names and IDs of up to 10 files.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function getChannel(auth) {
    var service = google.youtube('v3');
    service.channels.list({
        auth: auth,
        part: 'snippet,contentDetails,statistics',
        forUsername: 'GoogleDevelopers'
    }, function (err, response) {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        }
        var channels = response.data.items;
        if (channels.length == 0) {
            console.log('No channel found.');
        } else {
            console.log('This channel\'s ID is %s. Its title is \'%s\', and ' +
                'it has %s views.',
                channels[0].id,
                channels[0].snippet.title,
                channels[0].statistics.viewCount);
        }
    });
}