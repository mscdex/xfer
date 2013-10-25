var Protocol = require('../xfer');

var inspect = require('util').inspect,
    assert = require('assert');

var t = 0;
var tests = [
  { test: function(p) {
      var self = this, errors = [];
      p.on(0, function(stream) {
        assert(false, makeMsg(self, 'Protocol version error not fatal'));
      });
      p.on('error', function(err) {
        errors.push(err);
      });
      p.write(new Buffer([0x00, 0xFF, 0x01, 0x00, 0x00, 0x00]));
      assert(errors.length === 1 && /invalid protocol version/i.test(errors[0]),
             makeMsg(self, 'Wrong error count'));
    },
    what: 'Version mismatch is fatal'
  },
  { test: function(p) {
      var self = this, count = 0;
      p.on(0, function(stream) {
        assert(stream === undefined, makeMsg(self, 'Stream is set'));
        ++count;
      });
      p.write(new Buffer([0x01, 0x00,
                          0x00, 0x00]));
      assert(count === 1, makeMsg(self, 'Wrong event count'));
    },
    what: 'Empty payload, single write'
  },
  { test: function(p, cb) {
      var self = this, count = 0, sawEnd = false;
      p.on(0, function(stream) {
        assert(stream, makeMsg(self, 'Stream is not set'));
        ++count;
        var buf = '';
        stream.on('data', function(d) {
          buf += d;
        }).on('end', function() {
          sawEnd = true;
          assert(buf === 'ABC', makeMsg(self, 'Data mismatch'));
        });
      });
      p.write(new Buffer([0x01, 0x00,
                          0x00, 0x03, 0x41, 0x42, 0x43,
                          0x00, 0x00]));
      setImmediate(function() {
        assert(count === 1, makeMsg(self, 'Wrong event count'));
        assert(sawEnd, makeMsg(self, 'Did not see end of data'));
        cb();
      });
    },
    what: 'Single chunk, single write'
  },
  { test: function(p, cb) {
      var self = this, count = 0, sawEnd = false;
      p.on(0, function(stream) {
        assert(stream, makeMsg(self, 'Stream is not set'));
        ++count;
        var buf = '';
        stream.on('data', function(d) {
          buf += d;
        }).on('end', function() {
          sawEnd = true;
          assert(buf === 'ABC', makeMsg(self, 'Data mismatch'));
        });
      });
      var data = new Buffer([0x01, 0x00,
                             0x00, 0x03, 0x41, 0x42, 0x43,
                             0x00, 0x00]);
      p.write(data.slice(0, 1));
      p.write(data.slice(1, 2));
      p.write(data.slice(2, 3));
      p.write(data.slice(3, 8));
      p.write(data.slice(8));
      setImmediate(function() {
        assert(count === 1, makeMsg(self, 'Wrong event count'));
        assert(sawEnd, makeMsg(self, 'Did not see end of data'));
        cb();
      });
    },
    what: 'Single chunk, multiple writes'
  },
];

function next() {
  var tst;
  while (t < tests.length) {
    tst = tests[t++];
    if (tst.test.length === 1)
      tst.test.call(tst.what, new Protocol());
    else {
      tst.test.call(tst.what, new Protocol(), next);
      break;
    }
  }
}
next();

function makeMsg(what, msg) {
  return '[' + what + ']: ' + msg;
}