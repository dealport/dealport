'use strict';
var P = require('bluebird');
var nodePool = require('generic-pool');
var MongoClient = require('mongodb').MongoClient;

module.exports = function(config)
{
        var pool = nodePool.Pool({
                name: 'mongo',
                create: function(callback)
                {
                        MongoClient.connect(config.mongoUri, callback);
                },
                destroy: function(db)
                {
                        db.close();
                },
                min: parseInt(config.dbPoolMin, 10),
                max: parseInt(config.dbPoolMax, 10),
                idleTimeoutMillis : 30000,
                log : false
        });

        return {
                acquire: function(priority)
                {
                        return new P(function (resolve, reject)
                        {
                                pool.acquire(function(err, client)
                                {
                                        if (err)
                                        {
                                                reject(err);
                                                return;
                                        }

                                        resolve(client);
                                }, priority);
                        });
                },
                release: function(client)
                {
                        return pool.release(client);
                },
                releaseHandler: function(client)
                {
                        return function(arg)
                        {
                                pool.release(client);
                                return arg;
                        };
                }
        };
};
