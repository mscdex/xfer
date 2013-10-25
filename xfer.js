/*

  Header:

    [1 byte]  Version number

  Version 1:

    [1 byte]  Payload type
    1 or more of:
      [2 bytes] Chunk length (unsigned, big endian)
      [n bytes] Chunk data (chunk length bytes long)

    A chunk length of 0 terminates the payload. Messages with no content are
    permitted and may be useful to serve as a "signal."

*/

var inherits = require('util').inherits,
    ReadableStream = require('stream').Readable,
    DuplexStream = require('stream').Duplex;

var VERSION = 0x01,
    MAX_LENGTH = Math.pow(256, 2) - 1,
    BUF_TERM = new Buffer([0x00, 0x00]),
    EMPTY_FN = function(n) {};

function Protocol(opts) {
  if (!(this instanceof Protocol))
    return new Protocol(opts);

  var hwm;
  if (opts && typeof opts.highWaterMark === 'number')
    hwm = opts.highWaterMark;
  else
    hwm = 128 * 1024;
  DuplexStream.call(this, { highWaterMark: hwm });

  // Writable state variables
  this.state = 'version';
  this.stream = undefined;
  this.streamHwm = (opts && opts.streamHWM) || hwm;
  this.type = 0;
  this.len = 0;
  this.wildcards = 0;
  this.invalid = false;

  this.on('newListener', function(ev, listener) {
    if (ev === '*')
      ++this.wildcards;
  });
  this.on('removeListener', function(ev, listener) {
    if (ev === '*')
      --this.wildcards;
  });

  // Readable state variables
  this.waiting = false;
}
inherits(Protocol, DuplexStream);

Protocol.prototype.send = function(type, content) {
  var buf, len = 0, chlen = 0, first = true, r = false, nb = 0, i = 0;

  if (!content) {
    // no content -- useful for sending simple signals
    r = this.push(new Buffer([VERSION, type, 0x00, 0x00]));
  } else if (typeof content === 'string') {
    len = Buffer.byteLength(content);
    while (i < len) {
      if ((len - i) > MAX_LENGTH)
        chlen = MAX_LENGTH;
      else
        chlen = len;
      if (first) {
        first = false;
        buf = new Buffer(4 + chlen);
        buf[0] = VERSION;
        buf[1] = type;
        buf[2] = chlen >>> 8;
        buf[3] = (chlen & 0xFF);
        nb = buf.write(content.slice(i, i + chlen), 4);
      } else {
        buf = new Buffer(2 + chlen);
        buf[0] = chlen >>> 8;
        buf[1] = (chlen & 0xFF);
        nb = buf.write(content.slice(i, i + chlen), 2);
      }
      r = this.push(buf);
      i += nb;
    }
    r = this.push(BUF_TERM);
  } else if (Buffer.isBuffer(content)) {
    len = content.length;
    while (i < len) {
      if ((len - i) > MAX_LENGTH)
        chlen = MAX_LENGTH;
      else
        chlen = len;
      if (first) {
        first = false;
        buf = new Buffer(4 + chlen);
        buf[0] = VERSION;
        buf[1] = type;
        buf[2] = chlen >>> 8;
        buf[3] = (chlen & 0xFF);
        content.copy(buf, 4, i, i + chlen);
      } else {
        buf = new Buffer(2 + chlen);
        buf[0] = chlen >>> 8;
        buf[1] = (chlen & 0xFF);
        content.copy(buf, 2, i, i + chlen);
      }
      r = this.push(buf);
      i += chlen;
    }
    r = this.push(BUF_TERM);
  } else
    throw new Error('Invalid data type, must be false-y for no data, or string or Buffer');

  this.waiting = !r;

  return r;
};

Protocol.prototype._read = function(n) {
  if (this.waiting) {
    this.waiting = false;
    this.emit('ready');
  }
};
Protocol.prototype._write = function(chunk, encoding, cb) {
  if (this.invalid)
    return;

  var i = 0, len = chunk.length, state = this.state, chleft, stream, r;

  while (i < len) {
    if (state === 'data') {
      chleft = len - i;
      if (this.len >= chleft) {
        if (i === 0)
          r = this.stream.push(chunk);
        else
          r = this.stream.push(chunk.slice(i));
        this.len -= chleft;
        i = len;
      } else if (this.len < chleft) {
        r = this.stream.push(chunk.slice(i, i + this.len));
        i += this.len;
        this.len = 0;
      }
      if (this.len === 0)
        state = 'length1';
      else if (r)
        this.stream._read = EMPTY_FN;
      else {
        this.stream._read = function(n) { cb(); };
        return;
      }
      continue;
    } else if (state === 'length1' || state === 'length2') {
      this.len <<= 8;
      this.len += chunk[i];
      if (state === 'length1')
        state = 'length2';
      else if (this.len === 0) {
        if (this.stream) {
          stream = this.stream;
          this.stream = undefined;
          stream.push(null);
        } else {
          this.emit(this.type);
          if (this.wildcards)
            this.emit('*', this.type);
        }
        state = 'version';
      } else {
        if (!this.stream) {
          this.stream = new ReadableStream({ highWaterMark: this.streamHWM });
          this.stream._read = EMPTY_FN;
          this.emit(this.type, this.stream);
          if (this.wildcards)
            this.emit('*', this.type, this.stream);
        }
        state = 'data';
      }
    } else if (state === 'version') {
      if (chunk[i] !== VERSION) {
        this.invalid = true;
        return cb(new Error('Invalid protocol version: ' + chunk[i]));
      }
      state = 'type';
    } else if (state === 'type') {
      this.type = chunk[i];
      state = 'length1';
    }
    ++i;
  }

  this.state = state;
  cb();
};

module.exports = Protocol;