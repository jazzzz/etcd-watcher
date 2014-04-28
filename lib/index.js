var _ = require('underscore');

module.exports = {
    watch: watch,
};

function watch(etcd, k, cb) {
    if (_.isArray(k))
        watchKeys(etcd, k, cb);
    else
        watchSingleKey(etcd, k, cb);
}

function watchKeys(etcd, keys, cb) {
    var values = {};
    var isReady = false;

    _.each(keys, function (key) {
        watchSingleKey(etcd, key, function (err, value) {
            if (!err) {
                values[key] = value;
                notifyIfReady();
            }
        });
    });

    function notifyIfReady() {
        if (!isReady) {
            isReady = _.all(keys, function (key) {
                return key in values;
            });
        }
        if (isReady)
            cb(null, values);
    }
}

function watchSingleKey(etcd, key, cb) {
    waitSingleKey(etcd, key, function (err, index) {
        var prevValue;
        var watcher = etcd.watcher(key, index);
        watcher.on('change', function (res) {
            if (res.action == 'set'
                && (res.node.value !== prevValue)) {
                prevValue = res.node.value;
                cb(null, res.node.value);
            }
        })
    });
}

function waitSingleKey(etcd, key, cb) {
    wait();

    function wait() {
        etcd.get(key, function (err, res) {
            if (!err) {
                cb(null, res.node.modifiedIndex);
            } else if (err.error.errorCode == 100) { //key not found
                var watchIndex = 1;
                if ('index' in err.error)
                    watchIndex = err.error.index + 1;
                etcd.watchIndex(key, watchIndex, function (err, res) {
                    if (!err && res.action == 'set') {
                        cb(null, res.node.modifiedIndex);
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
