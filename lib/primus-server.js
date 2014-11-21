'use strict';

var Primus = require('primus');

module.exports = function(server)
{
        if (!server)
        {
                server = require('http').createServer();
        }

        var primus = new Primus(server,
        {
                parser: 'ejson', // supports Uint8Array and Date
                transformer: 'engine.io'
        });

        primus.use('emitter', 'primus-emitter');
        primus.use('multiplex', 'primus-multiplex');

        return primus;
};
