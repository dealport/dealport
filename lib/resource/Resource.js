'use strict';

var P = require('bluebird');
var hrtime = require('../swissarmyknife/hrtime');

/**
 *
 * @param {module:primus/Primus|module:primus/Spark} primus primus (client) or spark (server) object
 * @param {String} namespace
 * @constructor
 */
function Resource(primus, namespace)
{
        this.primus = primus;
        this.namespace = namespace;
}
Resource.debugLogging = false;

module.exports = Resource;

Resource.prototype.rpc = function(name, arg)
{
        var primus = this.primus;
        var start = Resource.debugLogging && hrtime();
        var fullname = this.namespace + '/' + name;
        arg = Array.prototype.slice.call(arguments, 1);

        return new P(function(resolve, reject)
        {
                if (Resource.debugLogging)
                {
                        console.log('RPC >', fullname, arg);
                }

                primus.send(fullname, arg, function(data)
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
        }).bind(this); // (bind the handlers of the promise, not the function you see above)
};

Resource.prototype.listen = function(names)
{
        var primus = this.primus;
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

                if (!primus) // null primus = just check if the listeners are valid
                {
                        return;
                }

                primus.on(fullname, function(args, result)
                {
                        var resultPromise;

                        if (Resource.debugLogging)
                        {
                                console.log('< RPC', fullname, args);
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

                }.bind(this));

        }, this);
};
