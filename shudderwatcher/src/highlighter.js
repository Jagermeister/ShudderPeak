const Highlights = require('./highlight.js');
const fs = require('fs');

const videoId = 341691714;
new Promise((resolve, reject) => {
    fs.readFile('./videos.json', (err, videos) => err ? reject(err) : resolve(JSON.parse(videos).videos));
})
.then(videos => videos.filter(v => v._id == 'v'+videoId)[0])
.then(video => {
    const startTime = new Date(video.created_at).getTime();
    const endTime = startTime + video.length * 1000;
    return [startTime, endTime];
})
.then(([startTime, endTime]) => {
    new Promise((resolve, reject) => {
        fs.readFile('./' + videoId + '.json', (err, messages) => err ? reject(err) : resolve(JSON.parse(messages)));
    })
    .then(messages => messages.filter(m => +m.time >= startTime && +m.time <= endTime))
    .then(messages => {
        console.log(messages.length)
        const messageHighlights = new Highlights(messages);
        messageHighlights.bucketsCreate();
        messageHighlights.bucketsHighlight();
        return messageHighlights.bucketsHighlighted;
    })
    .then(buckets => console.log(buckets.length))
});