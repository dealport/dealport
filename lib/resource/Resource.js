/*
 * DealPort
 * Copyright (c) 2015  DealPort B.V.
 *
 * This file is part of DealPort
 *
 * DealPort is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, version 3 of the License.
 *
 * DealPort is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with DealPort.  If not, see <http://www.gnu.org/licenses/>.
 *
 * In addition, the following supplemental terms apply, based on section 7 of
 * the GNU Affero General Public License (version 3):
 * a) Preservation of all legal notices and author attributions
 */

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
