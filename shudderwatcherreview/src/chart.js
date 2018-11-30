'use strict';

class Chart {
    constructor(dimensions, title) {
        this.x = dimensions.x;
        this.y = dimensions.y;
        this.width = dimensions.width;
        this.height = dimensions.height;
        this.title = title;

        this.xDomainEnd = 0;
        this.yDomainEnd = 0;
        this.data = {};
        // Series keyed by name where each timestep should
        // be present aka non-sparse
        this.highlightBoxes = [];
    }

    xRange(domain) {
        return this.x + this.width * (domain / this.xDomainEnd);
    }

    yRange(domain) {
        //return this.y + this.height * (1 - Math.log(domain > 5 ? domain : 1) / Math.log(this.yDomainEnd));
        return this.y + this.height * (1 - domain / this.yDomainEnd);
    }

    display(ctx) {
        const keys = Object.keys(this.data);
        if (keys.length) {
            this.xDomainEnd = Math.max(...Object.keys(this.data).map(k => this.data[k].length));
            let x = this.x,
                y = this.y;
            if (!this.yDomainEnd) {
                this.yDomainEnd = keys
                    .map(k => this.data[k].reduce((p, c) => Math.max(p, c)))
                    .reduce((p, c) => Math.max(p, c), 0);
            }

            ctx.fillStyle = 'rgba(40, 40, 210, 0.25)'
            for (let i = 0, l = this.highlightBoxes.length; i < l; i++) {
                const box = this.highlightBoxes[i];
                ctx.fillRect(this.xRange(box[0] - 0.5), this.y, this.xRange(1), this.height);
            }

            for (let i = 0; i < keys.length; i++) {
                let key = keys[i];
                let data = this.data[key].slice();
                ctx.strokeStyle = utility.colors[i];
                ctx.beginPath();
                ctx.moveTo(this.xRange(0), this.yRange(data.shift()));
                for (let a = 0, l = data.length; a < l; a++) {
                    ctx.lineTo(this.xRange(a + 1), this.yRange(data[a]));
                }

                ctx.stroke();
            }

            //if (this.title) utility.strokeText(ctx, this.title, x + 50, y);
            ctx.strokeStyle = 'black';
            utility.strokeText(ctx, this.yDomainEnd, x + 50, y + fontSize, true);
            ctx.beginPath();
            utility.strokeLines(ctx, [[x, y], [x, y + this.height], [x + this.width, y + this.height]]);

            if (keys.length > 100) {
                const dataMin = 30;
                for (let i = 0, l = this.data[keys[0]].length; i < l; i++) {
                    let dataSorted = keys.map(k => [k, this.data[k][i]]).sort((a, b) => b[1] - a[1]);
                    if (dataSorted[0][1] > dataMin) {
                        const id = dataSorted[0][0];
                        const img = document.createElement('img');
                        img.src = `./images/${id.slice(id.indexOf('_') +1, id.length)}.png`;

                        img.onload = () => {
                            ctx.drawImage(img, this.xRange(i + 1), this.y + this.height + 5 * (i % 5), 25, 25);
                        }
                    }
                }
            }
        }
    }
}