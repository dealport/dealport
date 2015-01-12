'use strict';

var P = require('bluebird');
var Primus = require('../generated-web/primus');
var EE = require('events').EventEmitter;
var DuplexSequencer = require('stream-sequencer').DuplexSequencer;
var sharejs = require('share/lib/client');
var contextFactory = require('share-context-factory');
P.promisifyAll(sharejs.Doc.prototype);

var READYSTATE = {
        // from Websocket
        CONNECTING: 0,
        OPEN: 1,
        CLOSING: 2,
        CLOSED: 3
};

function newStreamInstanceID()
{
        ++newStreamInstanceID.id;
        if (newStreamInstanceID.id > 0xFFFFFFFF)
        {
                newStreamInstanceID.id = 0;
        }

        return newStreamInstanceID.id;
}
newStreamInstanceID.id = new Date().getTime() % 0xFFFFFFFF;

// todo? use versioning in the primus connection to reload the client if the server has been updated?

function SharejsSocketAdapter()
{
        this.readyState = READYSTATE.CONNECTING;
        this.stream = null;
        // Overriden by sharejs:
        this.onopen = null;
        this.onclose = null;
        this.onmessage = null;
        this.onerror = null;

        // read by sharejs:
        this.canSendWhileConnecting = false;
        this.canSendJSON = true; // primus does ejson for us
}

SharejsSocketAdapter.prototype._handleOpened = function(channel, streamInstanceID)
{
        if (this.stream)
        {
                this._handleClosed();
        }

        this.stream = new DuplexSequencer(channel, {
                objectMode: true,
                queueMax: 100,
                maxListeners: 20,
                instanceID: streamInstanceID
        });

        this.stream.on('data', function(message)
        {
                if (this.onmessage)
                {
                        this.onmessage({data: message});
                }
        }.bind(this));

        this.stream.on('error', function(err)
        {
                if (this.onerror)
                {
                        this.onerror(err);
                }
        }.bind(this));

        this.stream.on('end', function()
        {
                if (this.onclose)
                {
                        this.onclose();
                }
        }.bind(this));

        this.readyState = READYSTATE.OPEN;

        if (this.onopen)
        {
                this.onopen();
        }
};

SharejsSocketAdapter.prototype._handleClosed = function()
{
        this.readyState = READYSTATE.CLOSED;

        if (this.stream)
        {
                this.stream.parentStream.removeAllListeners(); // this is the primus channel
                this.stream.removeAllListeners();
                this.stream = null;

                if (this.onclose)
                {
                        this.onclose();
                }
        }
};

SharejsSocketAdapter.prototype.send = function(message)
{
        // will throw if we are closed
        this.stream.write(message);
};

SharejsSocketAdapter.prototype.close = function()
{
        throw Error('close() is not allowed here');
};

function PrimusClientHandler(mySessionID)
{
        EE.call(this);
        this.sessionID = mySessionID;
        this.primus = null;
        this.initializeResolver = null;
        this.initializeData = null;
        this.shareChannel = null;
        this.shareSocketAdapter = null;
        this.share = null; // sharejs
}

module.exports = PrimusClientHandler;
require('inherits')(PrimusClientHandler, EE);

PrimusClientHandler.prototype.initialize = function()
{
        return new P(function(resolve, reject)
        {
                this.initializeResolver = {resolve: resolve, reject: reject};

                this.primus = new Primus({
                        url: ''
                });

                this.primus.on('open', this._onOpen.bind(this));
                this.primus.on('error', this._onError.bind(this));
                this.primus.on('close', this._onClose.bind(this));
                this.primus.on('reconnect', function() { console.log('Primus reconnect attempt...'); });
        }.bind(this));
};

PrimusClientHandler.prototype._onOpen = function()
{
        console.log('Primus (re)connected', this.sessionID);

        var streamInstanceID = newStreamInstanceID();

        // make sure sharejs does not send messages at this stage
        if (this.shareSocketAdapter)
        {
                this.shareSocketAdapter._handleClosed();
        }

        if (!this.shareChannel)
        {
                // primus multiplex resubscribes on reconnect
                this.shareChannel = this.primus.channel('sharejs');
                this.shareChannel.setMaxListeners(20);
        }

        console.log('Setting up sharejs with stream instance ID', streamInstanceID);

        if (!this.shareSocketAdapter)
        {
                this.shareSocketAdapter = new SharejsSocketAdapter();
        }

        this.shareSocketAdapter._handleOpened(this.shareChannel, streamInstanceID);

        if (!this.share)
        {
                this.share = new sharejs.Connection(this.shareSocketAdapter);
                // this.share.debug = true;
                // server sends sharejs init packet after it has received EHLO
                this._addShareContextFactory();
        }

        this.primus.send('EHLO', {sessionID: this.sessionID, sharejsStreamInstanceID: streamInstanceID}, function(data)
        {
                console.log('Server accepted EHLO', data);
                this.initializeData = data;

                if (this.initializeResolver)
                {
                        this.initializeResolver.resolve(this.initializeData);
                        this.initializeResolver = null;
                }

                this.emit('initialized');
        }.bind(this));
};

PrimusClientHandler.prototype._onClose = function()
{
        console.log('Primus closed');
        // connection closed, it might retry

        if (this.shareSocketAdapter)
        {
                this.shareSocketAdapter._handleClosed();
        }
};

PrimusClientHandler.prototype._onError = function(err)
{
        console.error('Primus error', err);

        if (this.initializeResolver)
        {
                this.initializeResolver.reject(err);
                this.initializeResolver = null;
        }
};

PrimusClientHandler.prototype._addShareContextFactory = function()
{
        this.share.contextFactory = contextFactory.bind(null, this.share);
};