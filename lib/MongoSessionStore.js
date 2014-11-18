'use strict';

var P = require('bluebird');
var ExpressStore = require('express-session').Store;

function MongoSessionStore(model)
{
        ExpressStore.call(this);
        this.model = model;
}
require('inherits')(MongoSessionStore, ExpressStore);

module.exports = MongoSessionStore;


MongoSessionStore.prototype.get = function(sid, callback)
{
        var model = this.model;

        if (!sid)
        {
                process.nextTick(function()
                {
                        callback(null);
                });
                return;
        }

        P.using(model.acquire(), function(client)
        {
                var sessionCollection = P.promisifyAll(client.collection('session'));
                return sessionCollection.findOneAsync({_id: sid});
        })
        .nodeify(callback);
};

MongoSessionStore.prototype.set = function(sid, session, callback)
{
        var model = this.model;

        P.using(model.acquire(), function(client)
        {
                var sessionCollection = P.promisifyAll(client.collection('session'));
                session._id = sid;

                return sessionCollection.updateAsync({_id: sid}, session, {upsert: true, w: 0});
        })
        .return()
        .nodeify(callback);
};

MongoSessionStore.prototype.destroy = function(sid, callback)
{
        var model = this.model;

        P.using(model.acquire(), function(client)
        {
                var sessionCollection = P.promisifyAll(client.collection('session'));

                return sessionCollection.removeAsync({_id: sid}, {w: 0});
        })
        .return()
        .nodeify(callback);
};

MongoSessionStore.prototype.length = function(callback)
{
        var model = this.model;

        P.using(model.acquire(), function(client)
        {
                var sessionCollection = P.promisifyAll(client.collection('session'));
                return sessionCollection.countAsync();
        })
        .nodeify(callback);
};

MongoSessionStore.prototype.clear = function(callback)
{
        var model = this.model;

        P.using(model.acquire(), function(client)
        {
                var sessionCollection = P.promisifyAll(client.collection('session'));

                return sessionCollection.removeAsync({}, {w: 0});
        })
        .return()
        .nodeify(callback);
};

P.promisifyAll(MongoSessionStore.prototype);