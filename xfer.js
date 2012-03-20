var STATE_NEED_TYPE = 0,
    STATE_NEED_LEN = 1,
    STATE_DATA = 2;

var inherits = require('util').inherits,
    EventEmitter = require('events').EventEmitter;

var Xfer = module.exports = function(typeLen, sizeLen, stream) {
  var self = this,
      state = STATE_NEED_TYPE,
      type = undefined,
      nType = 0,
      len = undefined,
      nLen = 0,
      recvd = 0,
      buffer = undefined;
  this.stream = stream;
  this.typeBytes = typeLen;
  this.sizeBytes = sizeLen;
  this.maxType = Math.pow(2, this.typeBytes * 8) - 1;
  this.maxPayloadSize = Math.pow(2, this.sizeBytes * 8) - 1;
  stream.on('data', function parse(data) {
    var i = 0, dataLen = data.length;
    if (state === STATE_NEED_TYPE) {
      buffer = len = undefined;
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
      if (!buffer)
        buffer = new Buffer(len);
      var numBytes = (recvd + dataLen > len ? len - recvd : dataLen);
      data.copy(buffer, recvd, i, i + numBytes);
      recvd += numBytes;
      if (recvd === len) {
        var actualType = type;
        state = STATE_NEED_TYPE;
        type = undefined;
        nType = 0;
        self.emit(actualType, buffer);
        self.emit('message', actualType, buffer);
      }
      if (numBytes !== dataLen) {
        // extra data in the pipeline
        parse(data.slice(i + numBytes));
      }
    }
  });
};
inherits(Xfer, EventEmitter);

Xfer.prototype.write = function(type, data) {
  var len = 0, outBuf, p = this.typeBytes;

  if (data)
    len = (Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data));

  if (data && len > this.maxPayloadSize)
    throw new Error('Cannot write data (' + data.length + ' bytes) larger than max allowed size of ' + this.maxPayloadSize + ' bytes');
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
