export default ((Messages) => {
        let messageManager = null;
        const loadingPromises = [];
        const timelineHighlight = document.getElementById("timelineHighlight");
        const videoElement = document.querySelector("video");

        const canvas_width = 1080,
            canvas_height = 450;
        const canvas = utility.canvasCreate("canvasContainer", "hexBackground", { width: canvas_width + 20, height: canvas_height });
        const ctx = canvas.getContext("2d");

        const fontSize = 20;
        const charts = [];
        const keyDownEvents = {};

        const buckets = [];
        const bucket_duration_ms = 30000,
            bucket_duration_sec = bucket_duration_ms / 1000;

        let rawMessageData = null;
            
        let startTimeChatMS, endTimeChatMS,
            xDomainStart, xDomainEnd,
            currentMessageTime,
            startTimeSec;

        let videosMetaData, videoMetaData;
        let highlightTimeoutId;

        let messagesLoadedResolve;
        function init() {
            fetch('videos.json')
                .then(response => response.json())
                .then(videos => {
                    videosMetaData = videos.videos;
                    const vSelect = document.querySelector("#vSelect");
                    vSelect.onchange = () => {
                        videoSet(videosMetaData[vSelect.selectedIndex]);
                    };
                    videos.videos.forEach(v => {
                        const o = document.createElement('option');
                        o.value = v._id;
                        o.innerHTML = v.channel.display_name + ' | ' + v.game;
                        vSelect.appendChild(o);
                    })

                    return videos.videos[0];
                })
                .then(video => videoSet(video));

            keyDownEvents[39] = () => timelineMoveForward();
            keyDownEvents[37] = () => timelineMoveBackward();

            ctx.font = fontSize + 'px Courier New';
            setInterval(() => {
                currentMessageTime = (videoElement.currentTime - startTimeSec) * 1000 + startTimeChatMS;
                if (!videoElement.paused) {
                    display();
                    updateTimelineHighlight();
                }
            }, 500)
        }

        function videoSet(video) {
            loadingPromises.length = 0;
            loadingPromises.push(
                new Promise((resolve, reject) => {
                    videoElement.addEventListener('loadeddata', (e) => {
                        resolve();
                    })
                })
            );
            loadingPromises.push(
                new Promise((resolve, reject) => {
                    messagesLoadedResolve = resolve;
                })
            );
            videoMetaData = video;
            videoElement.setAttribute('src', './' + video._id.slice(1) + '.json');
            fetch(video.messages)
                .then(response => response.json())
                .then(messages => {
                    messageManager = new Messages(messages);

                    rawMessageData = messages;
                    currentMessageTime = xDomainStart = startTimeChatMS = +messages[0].time;
                    xDomainEnd = endTimeChatMS = +messages[messages.length - 1].time;

                    charts.length = 0;
                    charts.push(new Chart({ x: 0, y: 0, width: canvas_width, height: 250 }));
                    charts.push(new Chart({ x: 0, y: 250, width: canvas_width, height: 150 }));
                    messagesLoadedResolve();
                });

            Promise.all(loadingPromises)
                .then(() => {
                    console.log("ALL PROMISES RESOLVED")
                    const videoStartTimeMS = new Date(videoMetaData.created_at).getTime();
                    const videoLength = videoMetaData.length;
                    const videoDuration = videoElement.duration;

                    const chatVideoSyncDiffSec = ((startTimeChatMS - videoStartTimeMS) / 1000);
                    const chatVideoSyncTime = videoDuration + (chatVideoSyncDiffSec - videoLength);
                    videoElement.currentTime = startTimeSec = chatVideoSyncTime;

                    const maxChatTime = startTimeChatMS + (videoLength - chatVideoSyncDiffSec) * 1000;
                    xDomainEnd = endTimeChatMS = endTimeChatMS > maxChatTime ? maxChatTime : endTimeChatMS;
                    bucketsCreate();
                    chartsBuild();
                    display();
                });
        }

        function playHighlights() {
            const videoEndDateTime = new Date(videoMetaData.created_at).getTime() + videoMetaData.length * 1000;
            const videoRemainingTime = videoElement.duration - videoElement.currentTime;
            const videoCurrentDateTime = videoEndDateTime - videoRemainingTime * 1000;

            const leadInTime = 2000;
            let closestBucket = messageManager.bucketsHighlighted.filter(b => videoCurrentDateTime < b.end);

            closestBucket = closestBucket ? closestBucket[0] : messageManager.bucketsHighlighted[0];
            if (videoCurrentDateTime < closestBucket.start - leadInTime) {
                videoElement.currentTime = videoElement.duration - (videoEndDateTime - closestBucket.start - leadInTime) / 1000;
                currentMessageTime = closestBucket.start - leadInTime;
            }

            if (videoElement.paused) videoElement.play();
            highlightTimeoutId = setTimeout(playHighlights, 1000);
        }

        function xToTime(x) {
            const xPercentage = x / canvas_width;
            const domain = xPercentage * (xDomainEnd - xDomainStart) + xDomainStart
            return {
                percentage: xPercentage,
                domain: domain,
                video: ((domain - startTimeChatMS) / (endTimeChatMS - startTimeChatMS)) * (videoElement.duration - startTimeSec) + startTimeSec,
            };
        }

        function bucketsCreate(duration = bucket_duration_ms) {
            buckets.length = 0;
            messageManager.bucketsCreate({
                bucket_duration: duration,
                start_time: xDomainStart,
                end_time: xDomainEnd
            })
            buckets.push(...messageManager.buckets);
        }

        function chartsBuild() {
            messageManager.bucketsHighlight();
            charts[0].highlightBoxes = messageManager.bucketsHighlighted;
            charts[0].data = {
                0: buckets.map(b => b.users.size),
                1: buckets.map(b => b.messages + b.emoteCount)
            };

            charts[1].data = {};
            Array.from(messageManager.imageKeys)
                .sort((a, b) =>
                    buckets.map(u => b in u.emotes ? u.emotes[b] : 0)
                        .reduce((p, c) => p + c, 0)
                    - buckets.map(u => a in u.emotes ? u.emotes[a] : 0)
                        .reduce((p, c) => p + c, 0)
                )
                .forEach((k, i) => {
                    const arr = buckets.map(b => k in b.emotes ? b.emotes[k] : 0);
                    charts[1].data[i + '_' + k] = arr;
                }
            );
        }

        function updateTimelineHighlight() {
            const start = currentMessageTime - bucket_duration_ms / 2,
                end = currentMessageTime + bucket_duration_ms / 2;
            const timeRangeData = rawMessageData.filter(d => d.time >= start && d.time < end);

            let messages = 0,
                users = new Set(),
                emoteCount = 0,
                emotes = {},
                emotesNoSpam = {};
            for (let i = 0, l = timeRangeData.length; i < l; i++) {
                const d = timeRangeData[i];
                messages++;
                users.add(d.user);
                emoteCount += Object.keys(d.emotes).reduce((p, c) => p + d.emotes[c], 0);
                for (let key in d.emotes) {
                    emotes[key] = emotes[key] || 0;
                    emotes[key] += d.emotes[key];
                    emotesNoSpam[key] = emotesNoSpam[key] || 0;
                    emotesNoSpam[key]++;
                }
            }

            timelineHighlight.innerHTML = `
                <span style="background-color: ${utility.colors[0]};">Messages</span>: ${messages}<br/>
                <span style="background-color: ${utility.colors[1]};">Users</span>: ${users.size}<br/>
                <span style="background-color: ${utility.colors[2]};">Images</span>: ${emoteCount}<br/>
                TOP IMAGES:<br/>
                ${Object.keys(emotes)
                    .map(k => [k, emotes[k], emotesNoSpam[k]])
                    .sort((a, b) => a[1] - b[1])
                    .map(e => e[1] + ' <img height="45" src="./images/' + e[0] + '.png"/><br/>')
                    .slice(-4)
                    .reverse()
                    .join('')}
            `;
        }

        function timelineMoveBackward() {
            const sec = bucket_duration_sec / 2,
                ms = bucket_duration_ms / 2;
            videoElement.currentTime -= sec;
            if (videoElement.currentTime < startTimeSec) {
                videoElement.currentTime = startTimeSec;
            }

            currentMessageTime -= ms;
            if (currentMessageTime < startTimeChatMS) {
                currentMessageTime = startTimeChatMS;
            }

            display();
            updateTimelineHighlight();
        }

        function timelineMoveForward() {
            const sec = bucket_duration_sec / 2,
                ms = bucket_duration_ms / 2;
            videoElement.currentTime += sec;
            if (videoElement.currentTime > videoElement.duration) {
                videoElement.currentTime = videoElement.duration;
            }

            currentMessageTime += ms;
            if (currentMessageTime > endTimeChatMS) {
                currentMessageTime = endTimeChatMS;
            }

            display();
            updateTimelineHighlight();
        }

        function xyFromMouseEvent(event) {
            const canvas_bounds = canvas.getBoundingClientRect();
            const y = event.clientY - canvas_bounds.top,
                x = event.clientX - canvas_bounds.left;
            return [x, y]
        }

        canvas.addEventListener("mousedown", event => {
            let x, y; [x, y] = xyFromMouseEvent(event);
            const xTime = xToTime(x);

            videoElement.currentTime = xTime.video;
            currentMessageTime = xTime.domain;
            display();
            updateTimelineHighlight();
        });

        canvas.addEventListener('wheel', event => {
            let x, y; [x, y] = xyFromMouseEvent(event);
            const xTime = xToTime(x);
            const xDomainDuration = xDomainEnd - xDomainStart;

            if (event.deltaY < 0) {
                const minBucketsShown = 50;
                if (xDomainDuration == minBucketsShown * bucket_duration_ms) {
                    return
                }
                const newDuration = xDomainDuration * 0.75;
                if (newDuration < bucket_duration_ms * minBucketsShown) {
                    xDomainStart = xTime.domain - bucket_duration_ms * minBucketsShown / 2;
                    xDomainEnd = xTime.domain + bucket_duration_ms * minBucketsShown / 2;
                    if (xDomainStart < startTimeChatMS) {
                        xDomainStart = startTimeChatMS
                        xDomainEnd = startTimeChatMS + minBucketsShown * bucket_duration_ms;
                    } else if (xDomainEnd > endTimeChatMS) {
                        xDomainEnd = endTimeChatMS;
                        xDomainStart = xDomainEnd - minBucketsShown * bucket_duration_ms;
                    }
                } else {
                    xDomainStart = xTime.domain - newDuration * xTime.percentage;
                    xDomainEnd = xDomainStart + newDuration;
                }
            } else {
                const maxDuration = endTimeChatMS - startTimeChatMS
                if (xDomainDuration == maxDuration) {
                    return
                }
                const newDuration = xDomainDuration * 2;
                if (newDuration > maxDuration) {
                    xDomainStart = startTimeChatMS;
                    xDomainEnd = endTimeChatMS;
                } else {
                    xDomainStart = xTime.domain - newDuration * xTime.percentage;
                    xDomainEnd = xDomainStart + newDuration;
                    if (xDomainStart < startTimeChatMS) {
                        xDomainStart = startTimeChatMS
                        xDomainEnd = startTimeChatMS + newDuration;
                    } else if (xDomainEnd > endTimeChatMS) {
                        xDomainEnd = endTimeChatMS;
                        xDomainStart = xDomainEnd - newDuration;
                    }
                }
            }

            bucketsCreate()
            chartsBuild();
            display();

            return false;
        }, {passive: true});

        window.addEventListener("keydown", event => {
            const f = keyDownEvents[event.keyCode.toString()];
            if (f) { f(); }
        });

        function display() {
            ctx.clearRect(0, 0, canvas_width, canvas_height);

            ctx.fillStyle = 'rgba(240, 0, 0, 0.3)';
            let xVideoTimeStart = (currentMessageTime - xDomainStart - bucket_duration_ms / 2) / (xDomainEnd - xDomainStart) * canvas_width,
                xVideoTimeEnd = (currentMessageTime - xDomainStart + bucket_duration_ms / 2) / (xDomainEnd - xDomainStart) * canvas_width;
            xVideoTimeStart = xVideoTimeStart < 0 ? 0 : xVideoTimeStart;
            xVideoTimeEnd = xVideoTimeEnd > canvas_width ? canvas_width : xVideoTimeEnd;
            ctx.fillRect(xVideoTimeStart, 0, xVideoTimeEnd - xVideoTimeStart, canvas_height);

            for (let i = 0, l = charts.length; i < l; i++) {
                charts[i].display(ctx);
            }
        }

        window.onload = () => init();
});