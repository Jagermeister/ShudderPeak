const child_process = require('child_process');

try {
    child_process.execSync(`ffmpeg -hide_banner -loglevel quiet -y -h`);
} catch(e) {
    console.log('/!\\ Error within ffmpeg splicing');
    throw new Error(e);
}