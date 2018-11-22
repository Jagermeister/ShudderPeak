var fs = require('fs');
const request = require('request');

var TOKEN_PATH = 'credentials.json';

/**
 * Create an OAuth2 client with the given scopes
 *
 * @param {Array[string]} scopes Google API Scopes for access
 */
module.exports = (scopes) => {
    return new Promise((resolve, reject) => {
        fs.readFile('client_secret.json', (err, data) => {
            err ? reject(err) : resolve(JSON.parse(data));
        });
    }).then(data => authorize(data, scopes));
}

/**
 * Create an OAuth2 client with the given credentials
 *
 * @param {Object} credentials The authorization client credentials.
 */
function authorize(credentials, scopes) {
    return new Promise((resolve, reject) => {
        fs.readFile(TOKEN_PATH, (err, token) => {
            if (err) {
                reject();
            } else {
                resolve(JSON.parse(token));
            }
        });
    }).catch(() => {
        return getNewToken(credentials, scopes);
    });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 */
function getNewToken(credentials, scopes) {
    return new Promise((resolve, reject) => {
        const body = {
            'client_id': credentials.client_id,
            'client_secret': credentials.client_secret,
            'grant_type': 'client_credentials',
            'scope': scopes.join(' ')
        }

        request.post('https://id.twitch.tv/oauth2/token', { json: body }, (err, response, body) => {
            if (err) {
                reject();
            } else {
                const token = Object.assign(
                    { 'created': Date.now()}, 
                    body
                )
                storeToken(token);
                resolve(token);
            }
        });
    });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
    fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) throw err;
        console.log('Token stored to ' + TOKEN_PATH);
    });
}