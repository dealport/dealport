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
                parser: 'JSON',
                transformer: 'engine.io'
        });

        primus.use('emitter', 'primus-emitter');

        return primus;
};
