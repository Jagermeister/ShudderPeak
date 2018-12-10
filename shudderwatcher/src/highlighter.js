const Highlights = require('./highlight.js');
const fs = require('fs');

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
new Promise((resolve, reject) => fs.readFile('./videos.json', (err, videos) => err ? reject(err) : resolve(JSON.parse(videos).videos)))
.then(videos => videos.filter(v => v._id == 'v'+videoId)[0])
.then(video => {
    const startTime = new Date(video.created_at).getTime();
    const endTime = startTime + video.length * 1000;
    return [startTime, endTime];
})
.then(([startTime, endTime]) => {
    console.log('    Video', videoId);
    console.log('>>>', new Date(startTime).toISOString());
    console.log('<<<', new Date(endTime).toISOString());
    new Promise((resolve, reject) => {
        fs.readFile('../data/highlight/' + videoId + '.json', (err, hightlight) => err ? reject(err) : resolve(JSON.parse(hightlight)));
    })
    .then(hightlight => hightlight.stats.filter(m => +m.time >= startTime && +m.time <= endTime))
    .then(messages => {
        console.log();
        console.log('    Messages:', messages.length);
        console.log('>>>', new Date(messages[0].time).toISOString());
        console.log('<<<', new Date(messages[messages.length-1].time).toISOString());
        const messageHighlights = new Highlights(messages);
        messageHighlights.bucketsCreate();
        messageHighlights.bucketsHighlight();
        return messageHighlights.bucketsHighlighted;
    })
    .then(buckets => {
        console.log('Highlights:', buckets.length);
        fs.writeFile('../data/download/' + videoId + '.json', JSON.stringify(
            {
                videoId: videoId,
                highlights: buckets.map(b => {
                    return {
                        start: Math.floor((b.start - startTime) / 1000),
                        end: Math.floor((b.end - startTime) / 1000)
                    };
                })
            }
        ), err => err ? console.log(err) : console.log('Highlight saved.'));
    });
});