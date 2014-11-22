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

        this._acquireDisposer = function(channelSpark)
        {
                this.getChannelSparkData(channelSpark).acquired--;
        }.bind(this);
}

module.exports = Resource;

Resource.debugLogging = false;

/**
 * Get the data for a channel spark (if multiplexing is enabled) or for a regular spark.
 * @param {module:primus/Spark|module:primus-multiplex/Spark} channel
 * @returns {{index: int, acquired: int}}
 */
Resource.prototype.getChannelSparkData = function(channel)
{
        if (!channel._ResourceChannelData)
        {
                var data = {
                        // index is -1 if this is a regular spark instead of a channel spark
                        index: -1,
                        acquired: 0
                };
                channel._ResourceChannelData = data;
                return data;
        }

        return channel._ResourceChannelData;
};

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
                        this.getChannelSparkData(channelSpark).index = index;

                        this.listenNames.forEach(function(name)
                        {
                                var fullname = this.namespace + '/' + name;
                                channelSpark.on(fullname, this._rpcHandler(channelSpark, name));
                        }, this);

                }.bind(this));

        }
        else // client side
        {
                for (i = 0; i < this.channelSparks.length; ++i)
                {
                        var channelSpark = primus.channel(this.namespace + '$' + i);
                        this.channelSparks[i] = channelSpark;
                        this.getChannelSparkData(channelSpark).index = i;
                }
        }
};

/**
 * Acquire a channel for sending data. If there are multiple channels, the least busy channel will be chosen.
 * @returns {Disposer} A disposer promise. see bluebird#using
 */
Resource.prototype.acquireChannelSparkForSending = function()
{
        if (!this.spark)
        {
                return P.reject(Error('This resource has been instantiated without a primus spark'));
        }

        if (!this.channelSparks.length)
        {
                // not using primus-multiplex
                this.getChannelSparkData(this.spark).acquired++;
                return P.resolve(this.spark).disposer(this._acquireDisposer);
        }

        var bestChannel = this.channelSparks[0];
        var lowestAcquired = this.getChannelSparkData(bestChannel).acquired;

        for (var i = 1; i < this.channelSparks.length; ++i)
        {
                var channel = this.channelSparks[i];
                var channelSparkData = this.getChannelSparkData(channel);

                if (channel &&
                    channelSparkData.acquired < lowestAcquired)
                {
                        lowestAcquired = channelSparkData.acquired;
                        bestChannel = channel;
                }
        }

        this.getChannelSparkData(bestChannel).acquired++;
        return P.resolve(bestChannel).disposer(this._acquireDisposer);
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

        return P.using(this.acquireChannelSparkForSending(), function(channel)
        {
                var channelSparkData = this.getChannelSparkData(channel);

                return new P(function (resolve, reject)
                {
                        if (Resource.debugLogging)
                        {
                                console.log('RPC >', channelSparkData.index, fullname, args);
                        }

                        channel.send(fullname, args, function (data)
                        {
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
                });
        }.bind(this)).bind(this); // (the last bind is for the handlers of the promise)
};

Resource.prototype._rpcHandler = function(channelSpark, name)
{
        var channelSparkData = this.getChannelSparkData(channelSpark);

        return function(args, result)
        {
                var resultPromise;

                if (Resource.debugLogging)
                {
                        console.log('< RPC', channelSparkData.index, this.namespace, name, args);
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
