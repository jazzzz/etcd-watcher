module.exports = {
    watch: watch,
};

function watch(etcd, key, cb) {
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
                            && (!res.prevNode || res.node.value !== res.prevNode.value))
                            cb(null, res.node.value);
                    }
                    watchChange();
                });
            }
        });
    }
}
