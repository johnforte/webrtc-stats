require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
function Bandwidth(pc, timeInterval) {
    this.pc = pc;
    this.timeInterval = timeInterval;
    this.listeners = {};
    this.start();
}

Bandwidth.prototype.on = function (event, fn) {
    if (this.listeners[event]){
        this.listeners[event].push(fn);
    } else {
        this.listeners[event] = [fn];
    }
};

Bandwidth.prototype.emit = function () {
    var args = Array.prototype.slice.call(arguments);
    var event = args.shift();
    if (this.listeners[event]){
        this.listeners[event].forEach(function (fn) {
            fn.apply(null, args);
        });
    }
};

Bandwidth.prototype.start = function () {
    var _self = this;
    _self.intervalEvent = setInterval(function () {
        _self.pc.getStats(null)
        .then(function(result) {
            var totalbytesReceived = 0;
            var totalbytesSent = 0;
            // console.log(result);
            Object.keys(result).forEach(function(key) {
                if (!result[key].ssrc) return;
                if(result[key].isRemote === true) return;
                _self.timestamp = typeof result[key].timestamp === "number" ? result[key].timestamp : result[key].timestamp.getTime();
                if (result[key].bytesReceived) {
                    totalbytesReceived += Number(result[key].bytesReceived);
                } else if (result[key].bytesSent) {
                    totalbytesSent += Number(result[key].bytesSent);
                }
            });
            if (_self.prevTotalbytesReceived && _self.prevTotalbytesSent) {
                var timestampInterval = _self.timestamp - _self.lastTimestamp;
                var seconds = timestampInterval/1000;
                var bytesSentPerSec = (totalbytesSent - _self.prevTotalbytesSent)/seconds;
                var bytesReceivedPerSec = (totalbytesReceived - _self.prevTotalbytesReceived)/seconds;
                var bandwidth = {upStream: Math.floor(bytesSentPerSec/1024), downStream: Math.floor(bytesReceivedPerSec/1024)};
                _self.emit("bandwidth", bandwidth);
            }
            _self.prevTotalbytesSent = totalbytesSent;
            _self.prevTotalbytesReceived = totalbytesReceived;
            _self.lastTimestamp = _self.timestamp;
        })
        .catch(function(err) {
            throw new Error(err);
        });
    }, _self.timeInterval);
};

Bandwidth.prototype.stop = function() {
    clearInterval(this.intervalEvent);
};

module.exports = Bandwidth;

},{}],"WebRTCUtils":[function(require,module,exports){
var Bandwidth = require("./Bandwidth");

function WebRTCUtils() {}

WebRTCUtils.prototype.getBandwidth = function(pc, timeInterval) {
    timeInterval = !timeInterval || timeInterval < 1000 ? 1000 : timeInterval;
    return new Bandwidth(pc, timeInterval);
};

WebRTCUtils.prototype.getConnectionDetails = function (pc) {
    return new Promise(function(resolve, reject) {
        pc.getStats(null)
        .then(function(stats) {
            var connectionDetails = {};
            var filtered = stats[Object.keys(stats).filter(function(key){return stats[key].googActiveConnection || stats[key].selected;})[0]];
            if (!filtered) return reject('Could not find proper stats');
            connectionDetails.remoteIpAddress = stats[filtered.remoteCandidateId].ipAddress;
            connectionDetails.remoteCandidateType = stats[filtered.remoteCandidateId].candidateType;
            connectionDetails.localIpAddress = stats[filtered.localCandidateId].ipAddress;
            connectionDetails.localCandidateType = stats[filtered.localCandidateId].candidateType;
            resolve(connectionDetails);
        });
    });
};

module.exports = new WebRTCUtils();

},{"./Bandwidth":1}]},{},["WebRTCUtils"]);