Description
===========

xfer is a module for [node.js](http://nodejs.org/) that reads and writes binary-compatible messages using a simple TLV-like protocol.


Requirements
============

* [node.js](http://nodejs.org/) -- v0.10.0 or newer


Install
=======

    npm install xfer


Example
=======
```javascript
  var net = require('net'),
      inspect = require('util').inspect,
      Xfer = require('./xfer');

  function makeDisplay(role, kind) {
    return function(arg1, arg2) {
      var type, stream;
      if (kind === true) {
        type = arg1;
        stream = arg2;
      } else {
        type = kind;
        stream = arg1;
      }
      if (!stream)
        console.log('[' + role + '] Type: ' + type + ', Data: (none)');
      else {
        var s = '';
        stream.on('data', function(d) { s += d; })
              .on('end', function() {
                console.log('[' + role + '] Type: ' + type + ', Data: ' + inspect(s));
              });
      }
    };
  }

  net.createServer(function(client) {
    this.close();
    client.xfer = new Xfer();
    client.pipe(client.xfer).pipe(client);

    client.xfer.on('*', makeDisplay('SERVER', true));

    client.xfer.send(0x01, 'Node.js rules! :-)');
    client.xfer.send(0x05);
  }).listen(8118, function() {
    var client = net.createConnection(8118);
    client.xfer = new Xfer();
    client.pipe(client.xfer).pipe(client);

    client.xfer.on(0x01, makeDisplay('CLIENT', 0x01))
               .on(0x05, makeDisplay('CLIENT', 0x05));
    client.on('connect', function() {
      client.xfer.send(0xFF, 'I am caught by the catch-all event!');
      client.end();
    });
  });

  // output:
  //
  // [CLIENT] Type: 5, Data: (none)
  // [CLIENT] Type: 1, Data: 'Node.js rules! :-)'
  // [SERVER] Type: 255, Data: 'I am caught by the catch-all event!'
```


API
===

_Xfer_ is a _Duplex_ stream

Xfer Events
-----------

Two types of events are emitted from an Xfer instance: integer (type) events and a special catch-all event ('*').

Integer (type) events are passed a Readable stream object if there was data with the message. The catch-all ('*') event is passed an additional argument (< _integer_ > type) before the stream object.


Xfer Methods
------------

 * *constructor* ([< _object_ >config]) - Creates and returns a new Xfer instance with the following valid `config` settings:

    * **highWaterMark** - _integer_ - The high water mark (in bytes) used for backpressure handling for this Xfer instance (default: 128KB)

    * **streamHWM** - _integer_ - The high water mark (in bytes) used for the data streams for inbound messages (default: `highWaterMark` value from above)

 * **send** (< _integer_ >type[, < _mixed_ >data]) - _boolean_ - Writes the message to the Readable stream portion of the Xfer instance. If provided, `data` can be either a Buffer or string. The return value indicates whether or not more sends should be performed.
