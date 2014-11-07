'use strict';

var P = require('bluebird');
var hrtime = require('../swissarmyknife/hrtime');
var Map = require('es6-map');

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

module.exports = Resource;

Resource.prototype.rpc = function(name, arg)
{
        var primus = this.primus;
        var start = hrtime();
        var fullname = this.namespace + '/' + name;
        arg = Array.prototype.slice.call(arguments, 1);

        return new P(function(resolve, reject)
        {
                console.log('RPC >', fullname, arg);

                primus.send(fullname, arg, function(data)
                {
                        var end = hrtime();
                        console.log('RPC <', fullname, ':', end - start, 'ms');
                        resolve(data);
                });

                // todo: reject after timeout?
        }).bind(this); // (bind the handlers of the promise, not the function you see above)
};

Resource.prototype.listen = function(names)
{
        var primus = this.primus;
        var ns = this.namespace;

        names.forEach(function(name)
        {
                var fullname = ns + '/' + name;

                if (typeof this[name] !== 'function')
                {
                        throw Error(name + ' is not a Resource method');
                }

                if (primus) // null primus = just check if the listeners are valid
                {
                        primus.on(fullname, function (args, result)
                        {
                                console.log('< RPC', fullname, args);
                                // use P.resolve to make sure this is a bluebird promise
                                // and not one from a database or orm library.

                                P.resolve(this[name].apply(this, args))
                                        .catch(function(err)
                                        {
                                                console.error('Error during RPC', err);
                                        })
                                        .done(result);
                        }.bind(this));
                }
        }, this);
};

Resource.entitiesToJSON = function entitiesToJSON(entities)
{
        if (Array.isArray(entities))
        {
                return Array.prototype.map.call(entities, entitiesToJSON);
        }

        return entities && entities.toJSON();
};

Resource.entitiesToIDMap = function(map, entities)
{
        if (!map)
        {
                map = new Map();
        }

        if (Array.isArray(entities))
        {
                entities.forEach(function (entity)
                {
                        map.set(entity.id, entity);
                });
        }
        else
        {
                map.set(entities.id, entities);
        }

        return map;
};
