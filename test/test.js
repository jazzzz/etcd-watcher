var assert = require('assert');
var _ = require('underscore');
var async = require('async');
var Etcd = require('node-etcd');

var etcd = new Etcd();
var etcdWatcher = require('../lib');

async.series([
    testMultiple,
], function (err) {
    assert.ifError(err);
    console.log('OK');
    process.exit(0);
});

function testMultiple(cb) {
    var keys = ['/test-ew/1', '/test-ew/2'];
    var watcher = etcdWatcher.watcher(etcd, keys);

    async.series([
        _.bind(etcd.del, etcd, keys[0]),
        _.bind(etcd.del, etcd, keys[1]),
    ], function (err) {
        var expect = expectSeries(watcher, [
            { '/test-ew/1': 'aa', '/test-ew/2': 'bb' },
            { '/test-ew/1': 'aa', '/test-ew/2': 'bc' },
        ]);
        async.series([
            _.bind(etcd.set, etcd, keys[0], 'aa'),
            _.bind(etcd.set, etcd, keys[1], 'bb'),
            _.bind(etcd.set, etcd, keys[1], 'bc'),
        ], function (err) {
            assert.ifError(err);
            expect.checkAllReceived(cb);
        });
    });
}

function expectSeries(watcher, values) {
    var expectedIndex = 0;
    watcher.wait(function (err, values) {
        assert.ifError(err);
        next(values);
    });
    watcher.on('change', function (values) {
        assert.notEqual(expectedIndex, 0);
        next(values);
    });

    return {
        checkAllReceived: checkAllReceived,
    };

    function next(value) {
        var expected = values[expectedIndex];
        if (_.isObject(expected))
            assert.deepEqual(value, expected);
        else
            assert.equal(value, expected);
        ++expectedIndex;
    }

    function checkAllReceived(cb) {
        setTimeout(function () {
            assert.equal(expectedIndex, values.length, 'not all expected values received');
            cb();
        }, 1000);
    }
}
