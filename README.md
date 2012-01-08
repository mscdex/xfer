Description
===========

xfer is a module for [node.js](http://nodejs.org/) that provides reading and writing of simple TLV (Type-Length-Value) tuples.

This module allows configurable type and length field sizes and requires that both sender and receiver agree on a type and length size.


Requirements
============

* [node.js](http://nodejs.org/) -- v0.4.0 or newer


Example
=======

        var net = require('net'), Xfer = require('xfer');

        var TYPE_SIZE = 1, // in bytes, 0 to 255
            LEN_SIZE = 2; // in bytes, 2 bytes == maximum payload size is 65535 bytes

        var server = net.createServer(function(client) {
          client.xfer = new Xfer(TYPE_SIZE, LEN_SIZE, client);
          client.xfer.write(0x20, 'My cool little message! :-)');
          client.xfer.write(0x01, new Buffer([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
        });
        server.listen(8118);

        process.nextTick(function() {
          var client = net.createConnection(8118);
          client.xfer = new Xfer(TYPE_SIZE, LEN_SIZE, client);
          client.xfer.on(0x20, function(data) {
            console.error('Got message 0x20: ' + data.toString());
          });
          client.xfer.on(0x01, function(data) {
            console.error('Got message 0x01: ' + require('util').inspect(data));
            client.end();
            server.close();
          });
        });

        // output:
        //    Got message 0x20: My cool little message! :-)
        //    Got message 0x01: <Buffer 01 02 03 04 05 06 07 08 09 0a>
