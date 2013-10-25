var Protocol = require('../xfer');

var path = require('path'),
    inspect = require('util').inspect,
    assert = require('assert');

var t = 0,
    group = path.basename(__filename, '.js') + '/';
var tests = [
  { test: function(p) {
      var self = this, buf = [];
      p.on('data', function(d) {
        buf.push(d);
      });
      p.send(5);
      assert(buf.length, makeMsg(this, 'No data'));
      buf = Buffer.concat(buf);
      assert(bufeql([0x01, 0x05,
                     0x00, 0x00],
                    buf),
             makeMsg(this, 'Wrong output: ' + inspect(buf)));
    },
    what: 'Empty payload'
  },
  { test: function(p) {
      var self = this, buf = [];
      p.on('data', function(d) {
        buf.push(d);
      });
      p.send(5, 'ABC');
      assert(buf.length, makeMsg(this, 'No data'));
      buf = Buffer.concat(buf);
      assert(bufeql([0x01, 0x05,
                     0x00, 0x03, 0x41, 0x42, 0x43,
                     0x00, 0x00],
                    buf),
             makeMsg(this, 'Wrong output: ' + inspect(buf)));
    },
    what: 'String, single chunk'
  },
  { test: function(p) {
      var self = this, buf = [];
      p.on('data', function(d) {
        buf.push(d);
      });
      var size = 32 * 1024,
          data = (new Array(size)).join('ABC'),
          expected = new Buffer(8 + (size * 3) - 3);
      expected.fill(0);
      expected[0] = 0x01;
      expected[1] = 0x05;
      expected[2] = 0xFF;
      expected[3] = 0xFF;
      expected.write(data.substring(0, 65535), 4);
      expected[65539] = 0x7F;
      expected[65540] = 0xFE;
      expected.write(data.substring(65535), 65541);
      p.send(5, data);
      assert(buf.length, makeMsg(this, 'No data'));
      buf = Buffer.concat(buf);
      assert(bufeql(expected,
                    buf),
             makeMsg(this, 'Wrong output: ' + inspect(buf)));
    },
    what: 'String, multiple chunks'
  },
  { test: function(p) {
      var self = this, buf = [];
      p.on('data', function(d) {
        buf.push(d);
      });
      p.send(5, 'ABC');
      assert(buf.length, makeMsg(this, 'No data'));
      buf = Buffer.concat(buf);
      assert(bufeql([0x01, 0x05,
                     0x00, 0x03, 0x41, 0x42, 0x43,
                     0x00, 0x00],
                    buf),
             makeMsg(this, 'Wrong output: ' + inspect(buf)));
    },
    what: 'Buffer, single chunk'
  },
  { test: function(p) {
      var self = this, buf = [];
      p.on('data', function(d) {
        buf.push(d);
      });
      var size = 32 * 1024,
          data = new Buffer((new Array(size)).join('ABC')),
          expected = new Buffer(8 + (size * 3) - 3);
      expected.fill(0);
      expected[0] = 0x01;
      expected[1] = 0x05;
      expected[2] = 0xFF;
      expected[3] = 0xFF;
      data.copy(expected, 4, 0, 65535);
      expected[65539] = 0x7F;
      expected[65540] = 0xFE;
      data.copy(expected, 65541, 65535);
      p.send(5, data);
      assert(buf.length, makeMsg(this, 'No data'));
      buf = Buffer.concat(buf);
      assert(bufeql(expected,
                    buf),
             makeMsg(this, 'Wrong output: ' + inspect(buf)));
    },
    what: 'Buffer, multiple chunks'
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
  return '[' + group + what + ']: ' + msg;
}

function bufeql(buf1, buf2) {
  var i, len;
  if (buf1.length !== buf2.length)
    return false;
  for (i = 0, len = buf1.length; i < len; ++i) {
    if (buf1[i] !== buf2[i])
      return false;
  }
  return true;
}
