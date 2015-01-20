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
var Model = require('./Model');
var DuplexSequencer = require('stream-sequencer').DuplexSequencer;

function ModelIndex(pool, livedb, sharejs)
{
        this._pool = pool;
        this.livedb = livedb;
        this.sharejs = sharejs;

        // Collection name => Model description object
        this.company = new (require('./CompanyModel'))(this);
        this.user = new (require('./UserModel'))(this);
        this.namedEntity = new (require('./NamedEntityModel'))(this);
        this.vacancy = new (require('./VacancyModel'))(this);
}

module.exports = ModelIndex;

ModelIndex.prototype.acquireExplicit = function(priority)
{
        var pool = this._pool;
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
};

ModelIndex.prototype.acquire = function(priority)
{
        var pool = this._pool;

        return this.acquireExplicit(priority)
        .disposer(function(client)
        {
                return pool.release(client);
        });
};

ModelIndex.prototype.release = function(client)
{
        var pool = this._pool;

        if (client)
        {
                return pool.release(client);
        }
};

ModelIndex.prototype.listenForSharejsChannel = function(channel, spark)
{
        // (should be called as soon as possible, or else the subscribe listener is too late)
        spark.sharejs = {
                channelSpark: null, // we get this form the subscribe listener
                streamInstanceID: null, // we get this from EHLO

                sequencer: null,
                sessionAgent: null,
                initialized: false // _completeInitialization has done its thing
        };

        spark.on('subscribe', function(subscribeChannel, channelSpark)
        {
                if (subscribeChannel !== channel)
                {
                        return;
                }

                if (spark.sharejs.initialized)
                {
                        console.error('Duplicate sharejs channel spark subscription');
                }

                spark.sharejs.channelSpark = channelSpark;

                this._completeInitialization(spark);
        }.bind(this));
};

ModelIndex.prototype.initializeSharejs = function(spark, streamInstanceID)
{
        spark.sharejs.streamInstanceID = streamInstanceID;
        this._completeInitialization(spark);
};

ModelIndex.prototype._completeInitialization = function(spark)
{
        var share = this.sharejs;
        // if both the channel subscribe and initializeSharejs() have happened...

        if (!spark.sharejs.channelSpark ||
            spark.sharejs.streamInstanceID === null)
        {
                // too early
                return;
        }

        if (spark.sharejs.initialized)
        {
                // duplicate
                return;
        }

        spark.sharejs.sequencer = new DuplexSequencer(spark.sharejs.channelSpark, {
                objectMode: true,
                queueMax: 100,
                instanceID: spark.sharejs.streamInstanceID
        });

        spark.sharejs.sessionAgent = share.listen(spark.sharejs.sequencer);
        spark.sharejs.sessionAgent.sessionStuff = spark.sessionStuff;
        spark.sharejs.initialized = true;
};

ModelIndex.prototype.sharejsFilter = P.method(function(collection, docId, docData, userAgent)
{
        if (!(this[collection] instanceof Model))
        {
                console.warn('sharejs filter', 'Invalid collection', collection);
                return P.reject(Error('Invalid collection'));
        }

        return this[collection].validateReadingAllowed(docId, userAgent.sessionStuff.user)
        .bind(this)
        .then(function()
        {
                if (!docData || !docData.data)
                {
                        return null;
                }

                return this[collection].filterDocument(docId, docData, userAgent.sessionStuff.user);
        });
});

ModelIndex.prototype.sharejsFilterOps = P.method(function(collection, docId, opData, userAgent)
{
        if (!(this[collection] instanceof Model))
        {
                console.warn('sharejs filterOps', 'Invalid collection', collection);
                return P.reject(Error('Invalid collection'));
        }

        return this[collection].validateReadingAllowed(docId, userAgent.sessionStuff.user);
});

ModelIndex.prototype.sharejsSubmit = P.method(function(collection, docId, opData, userAgent)
{
        if (!(this[collection] instanceof Model))
        {
                console.warn('sharejs submit', 'Invalid collection', collection);
                return P.reject(Error('Invalid collection'));
        }

        return this[collection].validateOperation(docId, opData, userAgent.sessionStuff.user);
});

ModelIndex.prototype.sharejsAfterSubmit = P.method(function(collection, docId, opData, snapshot, userAgent)
{
        if (!(this[collection] instanceof Model))
        {
                console.warn('sharejs after submit', 'Invalid collection', collection);
                return null;
        }

        return this[collection].afterSubmit(docId, opData, snapshot, userAgent.sessionStuff.user);
});

ModelIndex.prototype.sharejsSubscribe = P.method(function(collection, docId, version, userAgent)
{
        if (!(this[collection] instanceof Model))
        {
                console.warn('sharejs subscribe', 'Invalid collection', collection);
                return P.reject(Error('Invalid collection'));
        }

        return this[collection].validateReadingAllowed(docId, userAgent.sessionStuff.user);
});
