'use strict';

var P = require('bluebird');
var hrtime = require('../swissarmyknife/hrtime');

/**
 *
 * @param {module:primus/Spark} spark primus (client) or spark (server) object
 * @param {String} namespace
 * @param {int} [channels=10] Amount of multiplex channels, requires primus-multiplex.
 *         Use 0 to disable in which case primus-multiplex is not needed.
 *         If primus-multiplex is not available the default for this param is 0 instead of 10.
 *         Make sure both client and server pass exactly the same value for this parameter.
 * @constructor
 */
function Resource(spark, namespace, channels)
{
        this.primus = spark && (spark.primus || spark);
        this.spark = spark;
        this.namespace = namespace;
        this.channelSparks = [];
        this.listenNames = [];

        if (spark)
        {
                this._setupMultiplexing(channels);
        }
}

module.exports = Resource;

Resource.debugLogging = false;

Resource.prototype._setupMultiplexing = function(channels)
{
        var primus = this.primus;
        var spark = this.spark;
        var i;

        if (channels === undefined)
        {
                if  (!primus.channel)
                {
                        // primus-multiplex is not available and "channels" is not given
                        return;
                }

                channels = 10;
        }

        if (channels &&
            !primus.channel)
        {
                throw Error('channels argument is set, however primus-multiplex is not plugged in');
        }

        if (!channels)
        {
                return;
        }

        this.channelSparks = new Array(channels);

        if (spark.primus) // server-side spark
        {
                // channel must be created on the primus, not on the spark
                if (!primus._ResourceChannels)
                {
                        primus._ResourceChannels = Object.create(null);
                }

                for (i = 0; i < this.channelSparks.length; ++i)
                {
                        var channelName = this.namespace + '$' + i;
                        var channel = primus._ResourceChannels[channelName];

                        if (!channel)
                        {
                                channel = primus.channel();
                                primus._ResourceChannels[channelName] = channel;
                        }
                }

                // ugh...
                spark.on('subscribe', function(channel, channelSpark)
                {
                        var nameSplit = channel.name.split('$');

                        if (nameSplit.length !== 2 ||
                            nameSplit[0] !== this.namespace)
                        {
                                return;
                        }

                        var index = nameSplit[1];

                        this.channelSparks[index] = channelSpark;
                        channelSpark._ResourcePending = 0;
                        channelSpark._ResourceIndex = index;

                        this.listenNames.forEach(function(name)
                        {
                                var fullname = this.namespace + '/' + name;
                                channelSpark.on(fullname, this._rpcHandler(channel, name));
                        }, this);

                }.bind(this));

        }
        else // client side
        {
                for (i = 0; i < this.channelSparks.length; ++i)
                {
                        var channelSpark = primus.channel(this.namespace + '$' + i);
                        channelSpark._ResourcePending = 0;
                        channelSpark._ResourceIndex = i;
                        this.channelSparks[i] = channelSpark;
                }
        }
};

Resource.prototype.findChannel = function()
{
        if (!this.spark)
        {
                throw Error('This resource has been instantiated without a primus spark');
        }

        if (!this.channelSparks.length)
        {
                return this.spark;
        }

        var lowestPending = this.channelSparks[0]._ResourcePending;
        var bestChannel = this.channelSparks[0];

        for (var i = 1; i < this.channelSparks.length; ++i)
        {
                var channel = this.channelSparks[i];

                if (channel &&
                    channel._ResourcePending < lowestPending)
                {
                        lowestPending = channel._ResourcePending;
                        bestChannel = channel;
                }
        }

        return bestChannel;
};

/**
 *
 * @param name Name of the method to call on the other end.
 *        The other end must listen for this method name explicitly using .listen(name)
 * @param {...*} arg Any (e)json encodable value
 * @returns {Promise} Containing the rejected error or resolved return value
 */
Resource.prototype.rpc = function(name, arg)
{
        if (!this.spark)
        {
                throw Error('This resource has been instantiated without a primus spark');
        }

        var start = Resource.debugLogging && hrtime();
        var fullname = this.namespace + '/' + name;

        var args = new Array(arguments.length-1);
        for (var ai = 1; ai < arguments.length; ++ai) { args[ai-1] = arguments[ai]; }

        var channel = this.findChannel();

        return new P(function(resolve, reject)
        {
                if (Resource.debugLogging)
                {
                        console.log('RPC >', channel._ResourceIndex, fullname, args);
                }

                if ('_ResourcePending' in channel)
                {
                        ++channel._ResourcePending;
                }

                channel.send(fullname, args, function(data)
                {
                        if ('_ResourcePending' in channel)
                        {
                                --channel._ResourcePending;
                        }

                        var end = Resource.debugLogging && hrtime();
                        if (Resource.debugLogging)
                        {
                                console.log('RPC <', fullname, ':', end - start, 'ms');
                        }

                        if (data[0])
                        {
                                reject(Error('Error from server: ' + data[0]));
                        }
                        else
                        {
                                resolve(data[1]);
                        }
                });

                // todo: reject after timeout?
        }).bind(this); // (bind the handlers of the promise, not the function you see above)
};

Resource.prototype._rpcHandler = function(channel, name)
{
        return function(args, result)
        {
                var resultPromise;

                if (Resource.debugLogging)
                {
                        console.log('< RPC', channel._ResourceIndex, this.namespace, name, args);
                }
                // use P.resolve to make sure this is a bluebird promise
                // and not one from a database or orm library.

                try
                {
                        resultPromise = P.resolve(this[name].apply(this, args));
                }
                catch(err)
                {
                        resultPromise = P.reject(err);
                }

                resultPromise
                .catch(function(err)
                {
                        console.error('Error during RPC', err, err.stack);

                        if (result)
                        {
                                result([err.toString(), null]);
                                result = null;
                        }
                })
                .then(function(ret)
                {
                        if (result)
                        {
                                result([null, ret]);
                                result = null;
                        }
                })
                .done();
        }.bind(this);
};

/**
 * Start listening for one or more rpc calls
 * @param names The name to listen for, the method with
 *        the same name on "this" is called whenever .rpc() is invoked on the other end.
 */
Resource.prototype.listen = function(names)
{
        var spark = this.spark;
        var ns = this.namespace;

        if (!Array.isArray(names))
        {
                names = [names];
        }

        names.forEach(function(name)
        {
                var fullname = ns + '/' + name;

                if (typeof this[name] !== 'function')
                {
                        throw Error(name + ' is not a Resource method');
                }

                if (!spark) // null spark = just check if the listeners are valid
                {
                        return;
                }

                this.listenNames.push(name);

                this.channelSparks.forEach(function(channel)
                {
                        channel.on(fullname, this._rpcHandler(channel, name));
                }, this);

        }, this);
};
