var assert = require('assert');
var _ = require('underscore');
var async = require('async');
var Etcd = require('node-etcd');

var etcd = new Etcd();
var watcher = require('../lib');

async.series([
    test1,
    test2,
    testMultiple,
], function (err) {
    assert.ifError(err);
    console.log('OK');
    process.exit(0);
});

function test1(cb) {
    var key = 'test-etcd-watcher';
    var expect = expectSeries(['a', 'b', 'c', null, 1]);

    etcd.del(key, function (err) {
        watcher.watch(etcd, key, expect.next);
        async.series([
            _.bind(etcd.set, etcd, key, 'a'),
            _.bind(etcd.set, etcd, key, 'a'),
            _.bind(etcd.set, etcd, key, 'b'),
            _.bind(etcd.del, etcd, key),
            _.bind(etcd.set, etcd, key, 'c'),
            _.bind(etcd.set, etcd, key, null),
            _.bind(etcd.set, etcd, key, 1),
        ], function (err) {
            assert.ifError(err);
            expect.checkAllReceived(cb);
        });
    });
}

function test2(cb) {
    var key = 'test-etcd-watcher2';
    var expect = expectSeries(['foo', 'bar']);

    etcd.set(key, 'foo', function (err) {
        watcher.watch(etcd, key, expect.next);
        async.series([
            _.bind(etcd.set, etcd, key, 'bar'),
        ], function (err) {
            assert.ifError(err);
            expect.checkAllReceived(cb);
        });
    });
}

function testMultiple(cb) {
    var keys = ['/test-ew/1', '/test-ew/2'];
    var expect = expectSeries([
        { '/test-ew/1': 'aa', '/test-ew/2': 'bb' },
        { '/test-ew/1': 'aa', '/test-ew/2': 'bc' },
    ]);

    async.series([
        _.bind(etcd.del, etcd, keys[0]),
        _.bind(etcd.del, etcd, keys[1]),
    ], function (err) {
        watcher.watch(etcd, keys, expect.next);
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

function expectSeries(values) {
    var expectedIndex = 0;
    return {
        next: next,
        checkAllReceived: checkAllReceived,
    };

    function next(err, value) {
        assert.ifError(err);
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
