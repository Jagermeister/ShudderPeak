const child_process = require('child_process');
const fs = require('fs');

const f1 ='346999108_701_741.mp4',
    f2 = '346999108_1181_1221.mp4';

splitFiles(f1, f2);




function splitFiles(fileName1, fileName2) {
    console.time('FFMPEG Split & Fade');
    try {
        child_process.execSync(`ffmpeg -hide_banner -y \
-i ${fileName1} -vf fade=t=in:st=49:d=1:alpha=1,fade=t=out:st=0:d=1:alpha=1 1.mp4`);
    } catch (e) {
        console.log('/!\\ Error within ffmpeg splicing');
    }

    console.timeEnd('FFMPEG Split & Fade');
}