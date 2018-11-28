'use strict';

var utility = {};
utility.colors = ["#9467bd", "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"];
utility.urlParameterRegex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)");

utility.getParameterByName = function(name) {
    var url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var results = utility.urlParameterRegex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
};

utility.canvasCreate = function(containerId, id, dimensions) {
    let container = document.getElementById(containerId);
    if (container) {
        let canvas = document.createElement('CANVAS');
        canvas.id = id;
        canvas.setAttribute('width', dimensions.width);
        canvas.setAttribute('height', dimensions.height);
        canvas.oncontextmenu = 'return false;';
        canvas.style.background = 'rgb(130, 187, 236)';
        container.appendChild(canvas);
        return canvas;
    }
};

utility.strokeText = function(ctx, text, x, y, isAlignedRight) {
    if (isAlignedRight) x -= ctx.measureText(text).width;
    ctx.strokeText(text, x, y);
};

utility.strokeLines = function(ctx, data) {
    ctx.moveTo(...data.shift());
    for (let i = 0, l = data.length; i < l; i++) {
        ctx.lineTo(...data[i]);
    }
    ctx.stroke();
};