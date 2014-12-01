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
                acquireExplicit: function(priority)
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
                acquire: function(priority)
                {
                        return this.acquireExplicit(priority)
                        .disposer(function(client)
                        {
                                return pool.release(client);
                        });
                },
                release: function(client)
                {
                        if (client)
                        {
                                return pool.release(client);
                        }
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
