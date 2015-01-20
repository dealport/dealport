/*
 * DealPort
 * Copyright (c) 2014  DealPort B.V.
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
var nodePool = require('generic-pool');
var mongo = require('mongoskin');
var livedbmongo = require('livedb-mongo');
var livedb = require('livedb');
var sharejs = require('share');

P.promisifyAll(mongo.Collection.prototype);
P.promisifyAll(mongo.Cursor.prototype);
P.promisifyAll(mongo.Grid.prototype);
P.promisifyAll(mongo.GridStore);
P.promisifyAll(mongo.GridStore.prototype);
P.promisifyAll(require('mongodb').Collection.prototype);
P.promisifyAll(require('mongodb').Cursor.prototype);
P.promisifyAll(require('mongodb').Grid.prototype);
P.promisifyAll(require('mongodb').GridStore);
P.promisifyAll(require('mongodb').GridStore.prototype);
P.promisifyAll(livedb.client.prototype);

var ModelIndex = require('./');

module.exports = function(config)
{
        var initDb = mongo.db(config.mongoUri, {
                'native_parser': true,
                // http://docs.mongodb.org/manual/reference/write-concern/
                w: 'majority',
                j: true,
                wtimeout: 30 * 1000 // ms
        });
        initDb.bind('session');
        initDb.bind('namedEntity');
        initDb.bind('vacancy');


        P.join(
                // expire session that have not been used for 7 days
                initDb.session.ensureIndexAsync({lastAccess: 1}, { background: true, expireAfterSeconds: 7 * 24 * 60 * 60 }),
                initDb.namedEntity.ensureIndexAsync({ company: 1 }, { unique: true, sparse: true }),
                initDb.namedEntity.ensureIndexAsync({ user: 1 }, { unique: true, sparse: true }),
                initDb.vacancy.ensureIndexAsync({ company: 1, name: 1 }, { unique: true })
        )
        .then(function()
        {
                initDb.close();
        });


        var pool = nodePool.Pool({
                name: 'mongo',
                create: function(callback)
                {
                        P.try(function()
                        {
                                var db = mongo.db(config.mongoUri, {
                                        'native_parser': true,
                                        // http://docs.mongodb.org/manual/reference/write-concern/
                                        w: 'majority',
                                        j: true,
                                        wtimeout: 30 * 1000 // ms

                                });
                                db.bind('company');
                                db.bind('companyImport');
                                db.bind('session');
                                // uploadedImage.chunks
                                // uploadedImage.files
                                db.bind('user');
                                db.bind('namedEntity');
                                db.bind('vacancy');

                                return db;
                        }).nodeify(callback);
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

        var db = livedbmongo(mongo.db(config.mongoUri, {
                'native_parser': true,
                // http://docs.mongodb.org/manual/reference/write-concern/
                w: 'majority',
                j: true,
                wtimeout: 30 * 1000 // ms
        }));

        var live = livedb.client({
                db: db
        });

        var share = sharejs.server.createClient({
                backend: live
        });

        var models = new ModelIndex(pool, live, share);

        share.filter(function(collection, docId, docData, next)
        {
                //console.log('filter', collection, docId, docData);
                // used by fetch, bulkFetch, query, queryFetch
                models.sharejsFilter(collection, docId, docData, this)
                .catch(function(err)
                {
                        console.warn('sharejs filter error', err, err.stack);
                        return P.reject(err);
                })
                .nodeify(next);
        });

        share.filterOps(function(collection, docId, opData, next)
        {
                // used by getOps
                models.sharejsFilterOps(collection, docId, opData, this)
                .catch(function(err)
                {
                        console.warn('sharejs filterOps error', err, err.stack);
                        return P.reject(err);
                })
                .nodeify(next);
        });




        /* actions:
        connect // request.stream, request.req
        fetch
        bulk fetch // request.requests
        get ops // request.start, request.end
        subscribe // request.version
        bulk subscribe // request.requests
        submit // request.opData, request.channelPrefix
        after submit // request.opData, request.snapshot
        query

        request.agent
        request.action
        request.collection
        request.docName
        request.backend
        */

        share.use('submit', function(request, callback)
        {
                models.sharejsSubmit(
                        request.collection,
                        request.docName,
                        request.opData,
                        request.agent
                )
                .catch(function(err)
                {
                        console.warn('sharejs submit not allowed', err, err.stack);
                        return P.reject(err);
                })
                .nodeify(callback);
        });

        share.use('after submit', function(request, callback)
        {
                models.sharejsAfterSubmit(
                        request.collection,
                        request.docName,
                        request.opData,
                        request.snapshot,
                        request.agent
                )
                .nodeify(callback);
        });

        share.use('query', function(request, callback)
        {
                console.warn('Attempted use of sharejs query');
                callback(Error('sharejs queries are disabled, use a Resource instead'));
        });
        
        share.use('subscribe', function(request, callback)
        {
                // (also triggered by bulk subscribe)
                models.sharejsSubscribe(
                        request.collection,
                        request.docName,
                        request.version,
                        request.agent

                ).catch(function(err)
                {
                        console.warn('sharejs subscribe not allowed', err, err.stack);
                        return P.reject(err);
                })
                .nodeify(callback);
        });

        return models;
};
