var fs = require('fs');
const config = require('./config.json');
var readline = require('readline');

var TOKEN_PATH = 'credentials.json';

/**
 * Fetch credentials from file or user authentication
 *
 * @param {Array[string]} scopes Scopes for access
 */
module.exports = (scopes) => {
    return new Promise((resolve, reject) => {
        fs.readFile('client_secret.json', (err, data) => {
            err ? reject(err) : resolve(JSON.parse(data));
        });
    }).then(data => fetchCredentials(data, scopes));
}

/**
 * Create an OAuth2 client with the given credentials
 *
 * @param {Object} credentials The authorization client credentials.
 */
function fetchCredentials(credentials, scopes) {
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
 * Get and store new token after prompting for user authorization
 *
 */
function getNewToken(credentials, scopes=[]) {
    return new Promise((resolve, reject) => {
        const authUrl = `${config.auth.endpoint}?client_id=${credentials.client_id}&redirect_uri=http://localhost&response_type=token&scope=${scopes.join(' ')}`;
        console.log('Authorize this app by visiting this url:', authUrl);
        var rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        rl.question('Enter the URL from that page here:', (code) => {
            rl.close();

            const token = Object.assign(
                processURL(code),
                {
                    username: credentials.username,
                    created: Date.now()
                }
            );

            storeToken(token);
            resolve(token);
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

/**
 * Tranform url with querystring into key:value dictionary
 *
 * @param {string} url The URL address.
 */
function processURL(url) {
    const parameterStart = '#',
        tokenDelimiter = '&',
        keyValueDelimiter = '=';
    const queryString = url.indexOf(parameterStart) ? url.split('#')[1] : url;
    const parameters = queryString.split(tokenDelimiter);

    const keyValues = {};
    parameters.forEach(element => {
        let kv = element.split(keyValueDelimiter);
        keyValues[kv[0]] = kv[1];
    });

    return keyValues;
}