const fs = require('fs');
const config = require('./config.json');
const readline = require('readline');
const request = require('request');

const TOKEN_PATH = 'credentials.json';
const redirectPath = 'http://localhost';

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
                reject(err);
            } else {
                const t = JSON.parse(token);
                const n = Date.now();
                const e = 'Token Expired';
                (t.created + t.expires_in * 1000 < n) ? reject(t) : resolve(t);
            }
        });
    }).catch((token) => {
        return (token && token.refresh_token)
            ? refreshToken(credentials, token)
            : getNewToken(credentials, scopes);
    });
}

/**
 * Get and store new token after prompting for user authorization
 *
 */
function getNewToken(credentials, scopes=[]) {
    return new Promise((resolve, reject) => {
        const action = 'authorize';
        const params = {
            'client_id': credentials.client_id,
            'redirect_uri': 'http://localhost',
            'response_type': 'code',
            'scope': scopes.join(' ')
        };
        const authUrl = `${config.auth.endpoint+action}?${dictToString(params)}`;
        console.log('Authorize this app by visiting:', authUrl);
        var rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        rl.question('Enter the URL from that page here:', (code) => {
            rl.close();
            resolve(processURL(code))
        });
    }).then(code => {
        return new Promise((resolve, reject) => {
            const action = 'token';
            const params = {
                'client_id': credentials.client_id,
                'client_secret': credentials.client_secret,
                'code': code.code,
                'grant_type': 'authorization_code',
                'redirect_uri': redirectPath
            };
            const tokenUrl = `${config.auth.endpoint+action}?${dictToString(params)}`;
            request.post(tokenUrl, (err, response, body) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('body', body);
                    const token = Object.assign(JSON.parse(body), {
                        username: credentials.username,
                        created: Date.now()
                    });
                    storeToken(token);
                    resolve(token);
                }
            });
        });
    });
}

function refreshToken(credentials, token) {
    return new Promise((resolve, reject) => {
        const action = 'token';
        const params = {
            'client_id': credentials.client_id,
            'client_secret': credentials.client_secret,
            'refresh_token': token.refresh_token,
            'grant_type': 'refresh_token',
            'scope': token.scope.join(' ')
        };
        const tokenUrl = `${config.auth.endpoint+action}?${dictToString(params)}`;
        request.post(tokenUrl, (err, response, body) => {
            if (err) {
                reject(credentials, token);
            } else {
                const refreshToken = Object.assign(token, JSON.parse(body), {
                    created: Date.now()
                });
                storeToken(refreshToken);
                resolve(refreshToken);
            }
        });
    }).catch((credentials, token) => {
        return getNewToken(credentials, token.scope)
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
    const parameterStart = '?',
        tokenDelimiter = '&',
        keyValueDelimiter = '=';
    const queryString = url.indexOf(parameterStart) ? url.split(parameterStart)[1] : url;
    const parameters = queryString.split(tokenDelimiter);

    const keyValues = {};
    parameters.forEach(element => {
        let kv = element.split(keyValueDelimiter);
        keyValues[kv[0]] = kv[1];
    });

    return keyValues;
}

/**
 * Tranform key:value dictionary into querystring parameters 
 *
 * @param {Object} dict Key:Value store.
 */
function dictToString(dict) {
    return Object.keys(dict).map(k => `${k}=${dict[k]}`).join('&');
}