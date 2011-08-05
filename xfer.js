var MAX_DATA_SIZE = 65535 - 3; // 3 byte header: 1 byte type + 2 byte length

var Xfer = module.exports = function(stream) {
  var self = this,
      state = {
        type: undefined,
        len: new Array(),
        recvd: 0,
        buffer: undefined
      };
  this.stream = stream;
  stream.on('data', function parse(data) {
    var i = 0, dataLen = data.length;
    if (typeof state.type === 'undefined')
      state.type = data[i++];
    if (i < dataLen && state.len.length < 2)
      state.len.push(data[i++]);
    if (i < dataLen && state.len.length < 2)
      state.len.push(data[i++]);
    if (i < dataLen) {
      // packet data
      dataLen -= i;
      if (!state.buffer) {
        state.len = (state.len[0] << 8) + state.len[1];
        state.buffer = new Buffer(state.len);
      }
      var numBytes = (state.recvd + dataLen > state.len ? state.len - state.recvd : dataLen);
      data.copy(state.buffer, state.recvd, i, i + numBytes);
      state.recvd += numBytes;
      if (state.recvd === state.len) {
        self.emit(state.type, state.buffer);
        state.type = undefined;
        state.len = new Array();
        state.recvd = 0;
        state.buffer = undefined;
      }
      if (numBytes !== dataLen) {
        // extra data in the pipeline
        parse(data.slice(i + numBytes));
      }
    }
  });
};
require('util').inherits(Xfer, require('events').EventEmitter);
Xfer.prototype.write = function(type, data) {
  if (data && data.length > MAX_DATA_SIZE)
    throw new Error('Cannot write data (' + data.length + ' bytes) larger than max allowed size of ' + MAX_DATA_SIZE + ' bytes');
  else if (!this.stream.writable)
    throw new Error('Cannot write data: stream is no longer writable');
  else if (typeof type !== 'number' || type < 0 || type > 255)
    throw new Error('Packet type must be a number between 0 and 255');
  var len = 0, len1 = 0, len2 = 0, outBuf, newData = data;
  if (data && data.length > 0) {
    len = data.length;
    len1 = (data.length >> 8) & 0xFF;
    len2 = (data.length & 0xFF);
  }
  outBuf = new Buffer(3 + len);
  outBuf[0] = type;
  outBuf[1] = len1;
  outBuf[2] = len2;
  if (!Buffer.isBuffer(newData))
    newData = new Buffer(newData);
  newData.copy(outBuf, 3);
  this.stream.write(outBuf);
};