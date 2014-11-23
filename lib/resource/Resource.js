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
        this._acquireQueue = []; // promises that want a channel. {promise: Promise, exclusive: boolean}
        /** While handling an rpc request, this parameter
         * contains channel data for the duration of the RPC method.
         * @type {Object} contains a key "channelSpark", other keys are for your own use
         */
        this.currentChannelData = null;

        if (spark)
        {
                this._setupMultiplexing(channels);
        }

        this._acquireDisposer = this._acquireDisposer.bind(this);
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

                channels = 2; // todo 10
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
 * Get the data for a channel spark (if multiplexing is enabled) or for a regular spark.
 * @param {module:primus/Spark|module:primus-multiplex/Spark} channelSpark
 * @returns {{index: int, acquired: int}}
 */
Resource.prototype.getChannelSparkData = function(channelSpark)
{
        if (!channelSpark._ResourceChannelData)
        {
                var data = {
                        // index is -1 if this is a regular spark instead of a channel spark
                        index: -1,
                        acquired: 0,
                        exclusive: false,
                        subClassData: Object.create(null) // passed as the last argument to rpc handlers
                };
                data.subClassData.channelSpark = channelSpark;

                channelSpark._ResourceChannelData = data;
                return data;
        }

        return channelSpark._ResourceChannelData;
};


Resource.prototype._acquireDisposer = function(channelSpark)
{
        var channelSparkData = this.getChannelSparkData(channelSpark);
        channelSparkData.acquired--;
        channelSparkData.exclusive = false;

        if (this._acquireQueue.length)
        {
                if (this._acquireQueue[0].exclusive &&
                    channelSparkData.acquired)
                {
                        // next in queue wants exclusive access, however this channel still has stuff pending
                        return;
                }

                var queueItem = this._acquireQueue.shift();
                channelSparkData.acquired++;
                channelSparkData.exclusive = queueItem.exclusive;
                queueItem.resolve(channelSpark);
        }
};

/**
 * Acquire a channel spark for sending data. If there are multiple channels, the least busy channel will be chosen.
 * @param {boolean} [exclusive=false] If true, acquire the channel spark in exclusive mode, no other channel sparks will be able to acquire it until you are done.
 * @returns {module:bluebird/Disposer<module:primus/Spark|module:primus-multiplex/Spark>} A disposer promise. see bluebird#using
 */
Resource.prototype.acquireChannelSparkForSending = function(exclusive)
{
        exclusive = !!exclusive;
        if (!this.spark)
        {
                return P.reject(Error('This resource has been instantiated without a primus spark'));
        }

        if (!this.channelSparks.length)
        {
                // not using primus-multiplex
                var data = this.getChannelSparkData(this.spark);

                if (data.exclusive ||  // exclusive channel that is busy
                    (exclusive && data.acquired)) // exclusive access is requested and this channel is already in use
                {
                        return new P(function(resolve, reject)
                        {
                                this._acquireQueue.push({
                                        resolve: resolve,
                                        reject: reject,
                                        exclusive: exclusive
                                });
                        }.bind(this)).disposer(this._acquireDisposer);
                }

                data.exclusive = exclusive;
                data.acquired++;
                return P.resolve(this.spark).disposer(this._acquireDisposer);
        }

        var bestSparkChannel = null;
        var lowestAcquired = 0;

        for (var i = 0; i < this.channelSparks.length; ++i)
        {
                var channel = this.channelSparks[i];
                if (!channel)
                {
                        // subscribe event has not fired yet
                        continue;
                }

                var channelSparkData = this.getChannelSparkData(channel);

                if (channelSparkData.exclusive)
                {
                        // exclusive channel that is busy
                        continue;
                }

                if (exclusive &&
                    channelSparkData.acquired)
                {
                        // exclusive access is requested and this channel is already in use
                        continue;
                }

                if (!bestSparkChannel ||
                    channelSparkData.acquired < lowestAcquired)
                {
                        lowestAcquired = channelSparkData.acquired;
                        bestSparkChannel = channel;
                }
        }

        if (bestSparkChannel)
        {
                var bestData = this.getChannelSparkData(bestSparkChannel);
                bestData.exclusive = exclusive;
                bestData.acquired++;
                return P.resolve(bestSparkChannel).disposer(this._acquireDisposer);
        }

        return new P(function(resolve, reject)
        {
                this._acquireQueue.push({
                        resolve: resolve,
                        reject: reject,
                        exclusive: exclusive
                });
        }.bind(this)).disposer(this._acquireDisposer);
};

/**
 * Call a method on the other end (client/server). The other end must explicitly listen
 * for this method call by calling .listen() in its constructor.
 * @param {String} name Name of the method to call on the other end.
 *        The other end must listen for this method name explicitly using .listen(name)
 * @param {...*} arg Any (e)json encodable value
 * @returns {Promise} Containing the rejected error or resolved return value
 */
Resource.prototype.rpc = function(name, arg)
{
        var args = new Array(arguments.length+1);
        for (var ai = 0; ai < arguments.length; ++ai) { args[ai+1] = arguments[ai]; }

        return P.using(this.acquireChannelSparkForSending(), function(channelSpark)
        {
                args[0] = channelSpark;
                return this.channelRpc.apply(this, args);

        }.bind(this)).bind(this); // (the last bind is for the handlers of the promise)
};

/**
 * Call a method on the other end (client/server). The other end must explicitly listen
 * for this method call by calling .listen() in its constructor.
 * @param {module:primus/Spark|module:primus-multiplex/Spark} channelSpark
 * @param {String} name Name of the method to call on the other end.
 *        The other end must listen for this method name explicitly using .listen(name)
 * @param {...*} arg Any (e)json encodable value
 * @returns {Promise} Containing the rejected error or resolved return value
 */
Resource.prototype.channelRpc = function(channelSpark, name, arg)
{
        if (!this.spark)
        {
                throw Error('This resource has been instantiated without a primus spark');
        }

        var start = Resource.debugLogging && hrtime();
        var fullname = this.namespace + '/' + name;

        var args = new Array(arguments.length-2);
        for (var ai = 2; ai < arguments.length; ++ai) { args[ai-2] = arguments[ai]; }

        var channelSparkData = this.getChannelSparkData(channelSpark);

        return new P(function(resolve, reject)
        {
                if (Resource.debugLogging)
                {
                        console.log('RPC >', channelSparkData.index, channelSparkData.acquired, fullname, args);
                }

                channelSpark.send(fullname, args, function (data)
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
        }).bind(this); // (this bind is for the handlers of the promise);
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
                        this.currentChannelData = channelSparkData.subClassData;
                        resultPromise = P.resolve(this[name].apply(this, args));
                        this.currentChannelData = null;
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
