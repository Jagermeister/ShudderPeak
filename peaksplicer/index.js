const child_process = require('child_process');
const fs = require('fs');

fs.readdir('./input', (err, files) => {
    for (let i = 0, l = files.length; i < l; i += 2) {
        console.log(i, l);
        mergeFiles(files[i], files[i + 1]);
    }

    if (files.length % 2 == 1) {
        const fileName = files[files.length - 1]
        fs.copyFile('./input/' + fileName, './output/' + fileName, () => console.log('Moved Odd File'));
    }
});

const fileDuration = 50 * 1,
    fadeDuration = 1;
function mergeFiles(fileName1, fileName2) {
    console.time('FFMPEG Concat & Fade');
    try {
        child_process.execSync(`ffmpeg -hide_banner -y \
-i ./input/${fileName1} -i ./input/${fileName2} -an \
-filter_complex \
"[0:v] trim=start=0:end=${fileDuration - fadeDuration},setpts=PTS-STARTPTS [clip1];[1:v] trim=start=1,setpts=PTS-STARTPTS [clip2];[0:v] trim=start=${fileDuration - fadeDuration}:end=${fileDuration},setpts=PTS-STARTPTS [fadeoutsrc];[1:v] trim=start=0:end=1,setpts=PTS-STARTPTS [fadeinsrc];[fadeinsrc] fade=t=in:st=0:d=1:alpha=1 [fadein];[fadeoutsrc] fade=t=out:st=0:d=1:alpha=1 [fadeout];[fadeout][fadein] overlay [crossfade];[clip1][crossfade][clip2] concat=n=3 [master];[0:a][1:a] acrossfade=d=1 [audio]" \
-map "[master]" -map "[audio]" ./output/${fileName1}_${fileName2}.mp4`);
    } catch (e) {
        console.log('/!\\ Error within ffmpeg splicing');
    }

    console.timeEnd('FFMPEG Concat & Fade');
}