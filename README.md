Description
===========

xfer is a module for [node.js](http://nodejs.org/) that provides reading and writing of simple TLV (Type-Length-Value) tuples.

Each tuple has an 8-bit type (0x00 - 0xFF) and a max (data) value size of 65,532 bytes.


Requirements
============

* [node.js](http://nodejs.org/) -- v0.4.0 or newer


Example
=======

        var net = require('net'), Xfer = require('xfer');

        var server = net.createServer(function(client) {
          client.xfer = new Xfer(client);
          client.xfer.write(0x20, 'My cool little message! :-)');
          client.xfer.write(0x01, new Buffer([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
        });
        server.listen(8118);

        process.nextTick(function() {
          var client = net.createConnection(8118);
          client.xfer = new Xfer(client);
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


TODO
====

* Convert module to be a stream so you can simply pipe to it?