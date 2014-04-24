# etcd-watcher, watch etcd key creation and subsequent changes

## Install

You need [node-etcd](http://github.com/stianeikeland/node-etcd).

```
$ npm install node-etcd
$ npm install etcd-watcher
```

## Usage

```js
var Etcd = require('node-etcd');
var etcd = new Etcd();
var watcher = require('etcd-watcher');

watcher.watch(etcd, "key", function (err, value) {
    console.log(value);
});
```
