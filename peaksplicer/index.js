const child_process = require('child_process');

try {
    console.time('FFMPEG Concat & Fade');
    child_process.execSync(`ffmpeg -hide_banner -y \
-i 346999108_701_741.mp4 -i 346999108_1181_1221.mp4 -an \
-filter_complex \
"   [0:v] trim=start=0:end=49,setpts=PTS-STARTPTS [clip1];
    [1:v] trim=start=1,setpts=PTS-STARTPTS [clip2];
    [0:v] trim=start=49:end=50,setpts=PTS-STARTPTS [fadeoutsrc];
    [1:v] trim=start=0:end=1,setpts=PTS-STARTPTS [fadeinsrc];
    [fadeinsrc] fade=t=in:st=0:d=1:alpha=1 [fadein];
    [fadeoutsrc] fade=t=out:st=0:d=1:alpha=1 [fadeout];
    [fadeout][fadein] overlay [crossfade];
    [clip1][crossfade][clip2] concat=n=3 [output];
    [0:a][1:a] acrossfade=d=1 [audio]
" \
-map "[output]" -map "[audio]" 346999108_701_741_1181_1221.mp4
    `);
    console.timeEnd('FFMPEG Concat & Fade');
} catch(e) {
    console.log('/!\\ Error within ffmpeg splicing');
    throw new Error(e);
}