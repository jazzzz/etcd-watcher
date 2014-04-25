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
    start();

    function start() {
        etcd.get(key, function (err, res) {
            var watchIndex = 1;
            if (!err) {
                watchIndex = res.node.modifiedIndex + 1;
                cb(null, res.node.value);
                watchChange();
            } else if (err.error.errorCode == 100) { //key not found
                if ('index' in err.error)
                    watchIndex = err.error.index + 1;
                watchChange();
            } else {
                process.nextTick(start);
            }

            function watchChange() {
                etcd.watchIndex(key, watchIndex, function (err, res) {
                    if (!err) {
                        watchIndex = res.node.modifiedIndex + 1;
                        if (res.action == 'set'
                            && (!res.prevNode || res.node.value !== res.prevNode.value)) {
                            cb(null, res.node.value);
                        }
                    }
                    watchChange();
                });
            }
        });
    }
}
