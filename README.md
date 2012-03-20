Description
===========

xfer is a module for [node.js](http://nodejs.org/) that provides reading and writing of simple TLV (Type-Length-Value) tuples.

This module allows configurable type and length field sizes and requires that both sender and receiver agree on a type and length size.


Requirements
============

* [node.js](http://nodejs.org/) -- v0.4.0 or newer


Example
=======

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
            mediumBuf[i] = i;

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
                console.error('Message 0x20 chunk: ' + data);
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
                console.error('Message 0x01 chunk: ' + inspect(data));
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
              Message 0x20 chunk: My cool little message! :-)
              End of message 0x20
              Got message 0x01 (300000 bytes)
              Message 0x01 chunk: <Buffer 00 01 02 03 04 05 06 07 08 09 0a 0b 0c 0d 0e 0f 10 1
              1 12 13 14 15 16 17 18 19 1a 1b 1c 1d 1e 1f 20 21 22 23 24 25 26 27 28 29 2a 2b
              2c 2d 2e 2f 30 31 32 ...>
              Message 0x01 chunk: <Buffer e7 e8 e9 ea eb ec ed ee ef f0 f1 f2 f3 f4 f5 f6 f7 f
              8 f9 fa fb fc fd fe ff 00 01 02 03 04 05 06 07 08 09 0a 0b 0c 0d 0e 0f 10 11 12
              13 14 15 16 17 18 19 ...>
              Message 0x01 chunk: <Buffer 13 14 15 16 17 18 19 1a 1b 1c 1d 1e 1f 20 21 22 23 2
              4 25 26 27 28 29 2a 2b 2c 2d 2e 2f 30 31 32 33 34 35 36 37 38 39 3a 3b 3c 3d 3e
              3f 40 41 42 43 44 45 ...>
              Message 0x01 chunk: <Buffer 13 14 15 16 17 18 19 1a 1b 1c 1d 1e 1f 20 21 22 23 2
              4 25 26 27 28 29 2a 2b 2c 2d 2e 2f 30 31 32 33 34 35 36 37 38 39 3a 3b 3c 3d 3e
              3f 40 41 42 43 44 45 ...>
              Message 0x01 chunk: <Buffer cb cc cd ce cf d0 d1 d2 d3 d4 d5 d6 d7 d8 d9 da db d
              c dd de df e0 e1 e2 e3 e4 e5 e6 e7 e8 e9 ea eb ec ed ee ef f0 f1 f2 f3 f4 f5 f6
              f7 f8 f9 fa fb fc fd ...>
              Message 0x01 chunk: <Buffer 13 14 15 16 17 18 19 1a 1b 1c 1d 1e 1f 20 21 22 23 2
              4 25 26 27 28 29 2a 2b 2c 2d 2e 2f 30 31 32 33 34 35 36 37 38 39 3a 3b 3c 3d 3e
              3f 40 41 42 43 44 45 ...>
              Message 0x01 chunk: <Buffer c3 c4 c5 c6 c7 c8 c9 ca cb cc cd ce cf d0 d1 d2 d3 d
              4 d5 d6 d7 d8 d9 da db dc dd de df e0 e1 e2 e3 e4 e5 e6 e7 e8 e9 ea eb ec ed ee
              ef f0 f1 f2 f3 f4 f5 ...>
              Message 0x01 chunk: <Buffer 83 84 85 86 87 88 89 8a 8b 8c 8d 8e 8f 90 91 92 93 9
              4 95 96 97 98 99 9a 9b 9c 9d 9e 9f a0 a1 a2 a3 a4 a5 a6 a7 a8 a9 aa ab ac ad ae
              af b0 b1 b2 b3 b4 b5 ...>
              Message 0x01 chunk: <Buffer 9f a0 a1 a2 a3 a4 a5 a6 a7 a8 a9 aa ab ac ad ae af b
              0 b1 b2 b3 b4 b5 b6 b7 b8 b9 ba bb bc bd be bf c0 c1 c2 c3 c4 c5 c6 c7 c8 c9 ca
              cb cc cd ce cf d0 d1 ...>
              Message 0x01 chunk: <Buffer e7 e8 e9 ea eb ec ed ee ef f0 f1 f2 f3 f4 f5 f6 f7 f
              8 f9 fa fb fc fd fe ff 00 01 02 03 04 05 06 07 08 09 0a 0b 0c 0d 0e 0f 10 11 12
              13 14 15 16 17 18 19 ...>
              End of message 0x01
        */
