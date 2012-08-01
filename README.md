Description
===========

xfer is a module for [node.js](http://nodejs.org/) that provides reading and writing of simple TLV (Type-Length-Value) tuples.

This module allows configurable type and length field sizes and requires that both sender and receiver agree on a type and length size.


Requirements
============

* [node.js](http://nodejs.org/) -- v0.4.0 or newer


Example
=======
```javascript
  var net = require('net'), inspect = require('util').inspect,
      Xfer = require('xfer');

  var TYPE_LEN = 1, // in bytes, 0 to 255
      SIZE_LEN = 4, // in bytes, 4 bytes == maximum payload size is 4,294,967,295 bytes
      BUFFERING = true;

  var server = net.createServer(function(client) {
    client.xfer = new Xfer({
      typeLen: TYPE_LEN,
      sizeLen: SIZE_LEN,
      stream: client,
      writeOnly: true
    });

    var mediumBuf = new Buffer(300000); // 300kb message
    for (var i=0; i<300000; ++i)
      mediumBuf[i] = i % 256;

    client.xfer.write(0x20, 'My cool little message! :-)');
    client.xfer.write(0x01, mediumBuf);
  });
  server.listen(8118, function() {
    var client = net.createConnection(8118);
    client.xfer = new Xfer({
      typeLen: TYPE_LEN,
      sizeLen: SIZE_LEN,
      stream: client,
      buffer: BUFFERING
    });
    client.xfer.on(0x20, function(source, len) {
      if (BUFFERING)
        console.error('Got buffered message 0x20 (' + len + ' bytes): ' + source.toString());
      else {
        source.setEncoding('ascii');
        console.error('Got streaming message 0x20 (' + len + ' bytes)');
        source.on('data', function(data) {
          console.error('Message 0x20 chunk (' + Buffer.byteLength(data) + ' bytes): ' + data);
        });
        source.on('end', function() {
          console.error('End of message 0x20');
        });
      }
    });
    client.xfer.on(0x01, function(source, len) {
      if (BUFFERING) {
        console.error('Got buffered message 0x01 (' + len + ' bytes): ' + inspect(source));
        client.end();
        server.close();
      } else {
        console.error('Got streaming message 0x01 (' + len + ' bytes)');
        source.on('data', function(data) {
          console.error('Message 0x01 chunk (' + data.length + ' bytes): ' + inspect(data));
        });
        source.on('end', function() {
          console.error('End of message 0x01');
          client.end();
          server.close();
        });
      }
    });
  });

  /* example output with buffering enabled:
        Got buffered message 0x20 (27 bytes): My cool little message! :-)
        Got buffered message 0x01 (300000 bytes): <Buffer 00 01 02 03 04 05 06 07 08 09
        0a 0b 0c 0d 0e 0f 10 11 12 13 14 15 16 17 18 19 1a 1b 1c 1d 1e 1f 20 21 22 23 24
        25 26 27 28 29 2a 2b 2c 2d 2e 2f 30 31 32 ...>

    example output with buffering disabled:
        Got message 0x20 (27 bytes)
        Message 0x20 chunk (27 bytes): My cool little message! :-)
        End of message 0x20
        Got message 0x01 (300000 bytes)
        Message 0x01 chunk (10215 bytes): <Buffer 00 01 02 03 04 05 06 07 08 09 0a 0b 0c
        0d 0e 0f 10 11 12 13 14 15 16 17 18 19 1a 1b 1c 1d 1e 1f 20 21 22 23 24 25 26 27
        28 29 2a 2b 2c 2d 2e 2f 30 31 32 ...>
        Message 0x01 chunk (27740 bytes): <Buffer e7 e8 e9 ea eb ec ed ee ef f0 f1 f2 f3
        f4 f5 f6 f7 f8 f9 fa fb fc fd fe ff 00 01 02 03 04 05 06 07 08 09 0a 0b 0c 0d 0e
        0f 10 11 12 13 14 15 16 17 18 19 ...>
        Message 0x01 chunk (20440 bytes): <Buffer 43 44 45 46 47 48 49 4a 4b 4c 4d 4e 4f
        50 51 52 53 54 55 56 57 58 59 5a 5b 5c 5d 5e 5f 60 61 62 63 64 65 66 67 68 69 6a
        6b 6c 6d 6e 6f 70 71 72 73 74 75 ...>
        Message 0x01 chunk (35040 bytes): <Buffer 1b 1c 1d 1e 1f 20 21 22 23 24 25 26 27
        28 29 2a 2b 2c 2d 2e 2f 30 31 32 33 34 35 36 37 38 39 3a 3b 3c 3d 3e 3f 40 41 42
        43 44 45 46 47 48 49 4a 4b 4c 4d ...>
        Message 0x01 chunk (35040 bytes): <Buffer fb fc fd fe ff 00 01 02 03 04 05 06 07
        08 09 0a 0b 0c 0d 0e 0f 10 11 12 13 14 15 16 17 18 19 1a 1b 1c 1d 1e 1f 20 21 22
        23 24 25 26 27 28 29 2a 2b 2c 2d ...>
        Message 0x01 chunk (35040 bytes): <Buffer db dc dd de df e0 e1 e2 e3 e4 e5 e6 e7
        e8 e9 ea eb ec ed ee ef f0 f1 f2 f3 f4 f5 f6 f7 f8 f9 fa fb fc fd fe ff 00 01 02
        03 04 05 06 07 08 09 0a 0b 0c 0d ...>
        Message 0x01 chunk (45456 bytes): <Buffer bb bc bd be bf c0 c1 c2 c3 c4 c5 c6 c7
        c8 c9 ca cb cc cd ce cf d0 d1 d2 d3 d4 d5 d6 d7 d8 d9 da db dc dd de df e0 e1 e2
        e3 e4 e5 e6 e7 e8 e9 ea eb ec ed ...>
        Message 0x01 chunk (36304 bytes): <Buffer 4b 4c 4d 4e 4f 50 51 52 53 54 55 56 57
        58 59 5a 5b 5c 5d 5e 5f 60 61 62 63 64 65 66 67 68 69 6a 6b 6c 6d 6e 6f 70 71 72
        73 74 75 76 77 78 79 7a 7b 7c 7d ...>
        Message 0x01 chunk (32120 bytes): <Buffer 1b 1c 1d 1e 1f 20 21 22 23 24 25 26 27
        28 29 2a 2b 2c 2d 2e 2f 30 31 32 33 34 35 36 37 38 39 3a 3b 3c 3d 3e 3f 40 41 42
        43 44 45 46 47 48 49 4a 4b 4c 4d ...>
        Message 0x01 chunk (22605 bytes): <Buffer 93 94 95 96 97 98 99 9a 9b 9c 9d 9e 9f
        a0 a1 a2 a3 a4 a5 a6 a7 a8 a9 aa ab ac ad ae af b0 b1 b2 b3 b4 b5 b6 b7 b8 b9 ba
        bb bc bd be bf c0 c1 c2 c3 c4 c5 ...>
        End of message 0x01
  */
```


API
===

Events
------

Two types of events are emitted from an Xfer instance: integer events and a special "catch-all" event.

 * Integer events represent incoming TLV tuples where the integer is the type

 * A 'message' event is emitted for every incoming TLV tuple

Integer events are passed two values (*\<Buffer/Stream\>* source, *\<Integer\>* size) and the 'message' event is passed an additional argument (*\<Integer\>* type) before the source and size arguments. The source argument is a (readable only) stream only if 'buffer' was set to `false` in the configuration object passed to the constructor. The size value refers to the total size of the data in the source.

Methods
-------

 * *constructor* (*\<Object\>* config) - Available configuration properties include:

    * *\<Integer\>* typeLen - The number of bytes to use for the type field (default: 1)

    * *\<Integer\>* sizeLen - The number of bytes to use for the size/length field (default: 2)

    * *\<Stream\>* stream - A Stream object to use for reading/writing TLV data from/to

    * *\<Boolean\>* writeOnly - Do not interpret incoming data on the stream as TLV data (default: false)

    * *\<Boolean\>* buffer - Buffer incoming value data? (default: true)

 * **write** (*\<Integer\>* type, *\<Buffer/String\>* data) - (_void_) - Writes the given information as a TLV tuple to the stream

 * **pause** () - (_void_) - Pauses the underlying stream
 
 * **resume** () - (_void_) - Resumes the underlying stream
