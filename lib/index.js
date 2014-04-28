var util = require('util');
var EventEmitter = require('events').EventEmitter;
var _ = require('underscore');
var async = require('async');

module.exports = {
    watcher: watcher,
};

function watcher(etcd, keys) {
    return new Watcher(etcd, keys);
}

util.inherits(Watcher, EventEmitter);
function Watcher(etcd, keys) {
    this.etcd = etcd;
    this.keys = keys;
    this.watchers = null;
}

Watcher.prototype.wait = function (cb) {
    var etcd = this.etcd;
    var keys = this.keys;
    waitKeys(etcd, keys, _.bind(onSet, this));

    function onSet(err, results) {
        if (err) {
            cb(err);
        } else {
            var values = _.object(_.map(results, function (value, key) {
                return [key, value.node.value];
            }));
            cb(null, values);
            this.watchers = _.map(keys, function (key) {
                var watcher = etcd.watcher(key, results[key].node.modifiedIndex + 1);
                watcher.on("change", _.bind(function (val) {
                    values[key] = val.node.value;
                    this.emit('change', values);
                }, this));
                return watcher;
            }, this);
        }
    }
};

Watcher.prototype.stop = function () {
    if (this.watchers) {
        _.each(this.watchers, function (w) {
            w.stop();
        });
    }
};

function waitKeys(etcd, keys, cb) {
    async.map(keys, function (key, cb) {
        waitSingleKey(etcd, key, cb);
    }, function (err, res) {
        cb(err, _.object(keys, res));
    });
}

function waitSingleKey(etcd, key, cb) {
    wait();

    function wait() {
        etcd.get(key, function (err, res) {
            if (!err) {
                cb(null, res);
            } else if (err.error.errorCode == 100) { //key not found
                var watchIndex = 1;
                if ('index' in err.error)
                    watchIndex = err.error.index + 1;
                etcd.watchIndex(key, watchIndex, function (err, res) {
                    if (!err && res.action == 'set') {
                        cb(null, res);
                    } else {
                        wait();
                    }
                });
            } else {
                process.nextTick(wait);
            }
        });
    }
}
