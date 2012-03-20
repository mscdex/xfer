var STATE_NEED_TYPE = 0,
    STATE_NEED_LEN = 1,
    STATE_DATA = 2;

var inherits = require('util').inherits,
    EventEmitter = require('events').EventEmitter,
    Stream = require('stream');

function ValueStream() {
  this.readable = true;
}
inherits(ValueStream, Stream);
ValueStream.prototype.setEncoding = function(encoding) {
  this.encoding = encoding;
};
ValueStream.prototype.end = ValueStream.prototype.close = function() {
  this.readable = false;
};

var Xfer = module.exports = function(cfg) {
  cfg = cfg || {};
  if (!cfg.stream)
    throw new Error("No stream specified");
  var self = this,
      state = STATE_NEED_TYPE,
      type = undefined,
      nType = 0,
      len = undefined,
      nLen = 0,
      recvd = 0,
      source = undefined;
  this.stream = cfg.stream;
  this.isStreaming = !cfg.buffer;
  this.isWriteOnly = cfg.writeOnly;
  this.typeBytes = cfg.typeLen || 1;
  this.sizeBytes = cfg.sizeLen || 2;
  this.maxType = Math.pow(2, this.typeBytes * 8) - 1;
  this.maxPayloadSize = Math.pow(2, this.sizeBytes * 8) - 1;
  if (!this.isWriteOnly) {
    this.stream.on('data', function parse(data) {
      var i = 0, dataLen = data.length;
      if (state === STATE_NEED_TYPE) {
        source = len = undefined;
        recvd = nLen = 0;
        while (i < dataLen && nType < self.typeBytes) {
          ++nType;
          if (type === undefined)
            type = data[i++];
          else {
            type *= 256;
            type += data[i++];
          }
        }
        if (nType === self.typeBytes)
          state = STATE_NEED_LEN;
      }
      if (state === STATE_NEED_LEN) {
        while (i < dataLen && nLen < self.sizeBytes) {
          ++nLen;
          if (len === undefined)
            len = data[i++];
          else {
            len *= 256;
            len += data[i++];
          }
        }
        if (nLen === self.sizeBytes)
          state = STATE_DATA;
      }
      if (state === STATE_DATA && i < dataLen) {
        // message data
        dataLen -= i;
        if (!self.isStreaming && !source)
          source = new Buffer(len);
        var numBytes = (recvd + dataLen > len ? len - recvd : dataLen);
        if (!self.isStreaming)
          data.copy(source, recvd, i, i + numBytes);
        else {
          if (recvd === 0) {
            source = new ValueStream();
            self.emit(type, source, len);
            self.emit('message', type, source, len);
          }
          if (source.readable) {
            var chunk = data.slice(i, i + numBytes);
            source.emit('data', source.encoding ? chunk.toString(source.encoding) : chunk);
          }
        }
        recvd += numBytes;
        if (recvd === len) {
          var actualType = type;
          state = STATE_NEED_TYPE;
          type = undefined;
          nType = 0;
          if (!self.isStreaming) {
            self.emit(actualType, source, len);
            self.emit('message', actualType, source, len);
          } else
            source.emit('end');
        }
        if (numBytes !== dataLen) {
          // extra data in the pipeline
          parse(data.slice(i + numBytes));
        }
      }
    });
  }
};
inherits(Xfer, EventEmitter);

Xfer.prototype.write = function(type, data) {
  var len = 0, outBuf, p = this.typeBytes;

  if (data)
    len = (Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data));

  if (data && len > this.maxPayloadSize)
    throw new Error('Cannot write data (' + data.length +
                    ' bytes) larger than max allowed size of ' +
                    this.maxPayloadSize + ' bytes');
  else if (!this.stream.writable)
    throw new Error('Cannot write data: stream is no longer writable');
  else if (typeof type !== 'number' || type < 0 || type > this.maxType)
    throw new Error('Message type must be a number between 0 and ' + this.maxType);

  outBuf = new Buffer(this.typeBytes + this.sizeBytes + len);

  outBuf[this.typeBytes - 1] = type & 0xFF;
  for (var i = 1; i < this.typeBytes; ++i)
    outBuf[this.typeBytes - 1 - i] = Math.floor(type / Math.pow(256, i)) & 0xFF;

  outBuf[p + (this.sizeBytes - 1)] = len & 0xFF;
  for (var i = 1; i < this.sizeBytes; ++i)
    outBuf[p + (this.sizeBytes - 1 - i)] = Math.floor(len / Math.pow(256, i)) & 0xFF;

  p += this.sizeBytes;

  if (len)
    (Buffer.isBuffer(data) ? data : new Buffer(data)).copy(outBuf, p);
  this.stream.write(outBuf);
};
