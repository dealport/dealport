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

var Resource = require('../Resource');
var GridStore = require('mongoskin').GridStore;
var ObjectID = require('mongodb').ObjectID;
var Rearranger = require('stream-sequencer').Rearranger;

function UploadedImage(primus, model, config, user)
{
        Resource.call(this, primus, 'UploadedImage', 1);
        this.model = model;
        this.user = user;

        this.listen(['clearCompanyLogo', 'updateCompanyLogoStart', 'updateCompanyLogoEnd']);
}

require('inherits')(UploadedImage, Resource);
module.exports = UploadedImage;

UploadedImage.maxByteSize = 1024 * 1024;

function noop(){}

UploadedImage.prototype.clearCompanyLogo = function(companyId, expectedCompanyVersion)
{
        // todo
};

function resetChannelData(channelData)
{
        channelData.model = null;
        channelData.mongoClient = null;
        channelData.companyId = null;
        channelData.valid = false;
        channelData.error = null;
        channelData.expectedLastSequenceID = -1; // as specified by the client
        channelData.rearranger = null;
        channelData.fileSizeSoFar = 0;
        channelData.gridStore = null;
        channelData.onData = null;
        channelData.cleanupAfterError = noop;
        channelData.endResolve = null;
        channelData.endReject = null;
        channelData.expectedVersion = null;
}

function commitData(channelData, imageData)
{
        channelData.fileSizeSoFar += imageData.length;

        if (channelData.fileSizeSoFar > UploadedImage.maxByteSize)
        {
                channelData.valid = false;
                channelData.error = Error('The image file must be smaller than ' + UploadedImage.maxByteSize + ' bytes');
                channelData.cleanupAfterError();
                return;
        }

        channelData.gridStore.writeAsync(imageData).catch(function(err)
        {
                channelData.valid = false;
                channelData.error = err;
                channelData.cleanupAfterError();
        });
}

function tryEnd(channelData)
{
        var livedb = channelData.model.livedb;

        if (channelData.expectedLastSequenceID < 0 ||
            channelData.expectedLastSequenceID !== channelData.rearranger.lastSequenceID)
        {
                return; // not done yet
        }

        if (channelData.onData)
        {
                channelData.channelSpark.removeListener('data', channelData.onData);
        }

        P.resolve().then(function()
        {
                if (channelData.error)
                {
                        return P.reject(channelData.error);
                }
                else if (!channelData.valid)
                {
                        return P.reject(Error('Incorrect ordering of operations'));
                }

                return channelData.gridStore.closeAsync();
        })
        .then(function()
        {
                return livedb.submitAsync('company', channelData.companyId, {
                        op: [
                                {
                                        p: ['logoUploadedImage'],
                                        od: null,
                                        oi: channelData.fileId.toString()
                                }
                        ],
                        v: channelData.expectedVersion
                });
        })
        .then(function()
        {
                console.log('Completed file upload',
                        channelData.fileSizeSoFar,
                        channelData.fileId,
                        channelData.companyId
                );

                return '/company-logo/' + channelData.companyId;
        })
        .then(function(ret)
        {
                channelData.endResolve(ret);
        })
        .catch(function(err)
        {
                channelData.endReject(err);
                channelData.cleanupAfterError();
                return P.reject(err);
        })
        .finally(function()
        {
                channelData.model.release(channelData.mongoClient);
                channelData.mongoClient = null; // prevent duplicate releases
                resetChannelData(channelData);
        });
}

function sparkDataListener(channelData)
{
        return function(data)
        {
                if (!(data instanceof Uint8Array))
                {
                        return; // primus-emitter event
                }

                if (!channelData.valid)
                {
                        // todo notify the client immediately of the error
                        return;
                }

                // todo max chunk size?

                channelData.rearranger.write(new Buffer(data));
        };
}


function rearrangerDataListener(channelData)
{
        return function(data)
        {
                commitData(channelData, data);
                tryEnd(channelData);
        };
}

function cleanupAfterError(channelData, model)
{
        return function()
        {
                channelData.gridStore.close(function (err)
                {
                        if (err)
                        {
                                console.error('Error in clean up', Error().stack, ' caused by ', err, err.stack);
                        }
                });

                GridStore.unlink(channelData.mongoClient, 'uploadedImage', function (err)
                {
                        if (err)
                        {
                                console.error('Error in clean up', Error().stack, ' caused by ', err, err.stack);
                        }
                });

                model.release(channelData.mongoClient);
                channelData.mongoClient = null; // prevent duplicate releases

                channelData.cleanupAfterError = noop;
        };
}

UploadedImage.prototype.updateCompanyLogoStart = function(companyIdArg, mimeType)
{
        var channelData = this.currentChannelData;
        var user = this.user;
        var model = this.model;

        resetChannelData(channelData);

        if (!user ||
            !user._id)
        {
                return P.reject(Error('You must be logged in'));
        }

        if (mimeType !== 'image/png' &&
            mimeType !== 'image/jpeg')
        {
                return P.reject(Error('Invalid mime type'));
        }

        return model.acquireExplicit().then(function(db)
        {
                return P.method(function()
                {
                        channelData.model = model;
                        channelData.mongoClient = db;
                        channelData.companyId = companyIdArg;

                        return db.company.findOneAsync({_id: channelData.companyId})
                        .bind(this)
                        .then(function(company)
                        {
                                if (!company)
                                {
                                        throw Error('Invalid company id');
                                }


                                if (!model.company.isEditableByUser(company, user))
                                {
                                        throw Error('You are not allowed to edit this company');
                                }
                        })
                        .then(function()
                        {
                                channelData.fileId = new ObjectID();

                                var gridStore = db.gridStore(
                                        channelData.fileId,
                                        'w',
                                        {
                                                root: 'uploadedImage',
                                                'content_type': mimeType,
                                                createdByUser: user._id,
                                                uploadedForCompany: channelData.companyId
                                        }
                                );

                                channelData.cleanupAfterError = cleanupAfterError(channelData, model);

                                return gridStore.openAsync();
                        })
                        .then(function(gridStore)
                        {
                                channelData.gridStore = gridStore;
                                channelData.valid = true;
                                channelData.rearranger = new Rearranger({queueMax: 50});
                                channelData.rearranger.on('error', function(err)
                                {
                                        channelData.error = err;
                                        channelData.cleanupAfterError();
                                });
                                channelData.rearranger.on('data', rearrangerDataListener(channelData));
                                channelData.onData = sparkDataListener(channelData);
                                channelData.channelSpark.on('data', channelData.onData);
                        });
                }.bind(this))()
                .finally(function()
                {
                        if (!channelData.valid)
                        {
                                model.release(channelData.mongoClient);
                                channelData.mongoClient = null; // prevent duplicate releases
                        }
                });
        }.bind(this));
};

UploadedImage.prototype.updateCompanyLogoEnd = function(lastSequenceID, expectedCompanyVersion)
{
        var channelData = this.currentChannelData;

        channelData.expectedLastSequenceID = lastSequenceID;
        channelData.expectedVersion = expectedCompanyVersion;
        tryEnd(channelData);

        return new P(function(resolve, reject)
        {
                channelData.endResolve = resolve;
                channelData.endReject = reject;
        });
};

UploadedImage.prototype.imageAsResponse = function(id, res, maxAge)
{
        var model = this.model;

        function do404()
        {
                res.statusCode = 404;
                res.setHeader('Content-Type' ,'text/plain; charset=UTF-8');
                res.end('404');
        }

        return P.using(model.acquire(), function(db)
        {
                if (!id)
                {
                        do404();
                        return null;
                }

                try
                {
                        id = new ObjectID(id);
                }
                catch(err)
                {
                        do404();
                        return null;
                }

                var gridStore = db.gridStore(
                        id,
                        'r',
                        {root: 'uploadedImage'}
                );

                return gridStore.openAsync()
                .then(function(gridStore)
                {
                        if (maxAge)
                        {
                                res.setHeader('Cache-Control', 'public, max-age=' + maxAge);
                        }
                        res.setHeader('Content-Length', gridStore.length);
                        if (gridStore.contentType)
                        {
                                res.setHeader('Content-Type', gridStore.contentType);
                        }

                        var stream = gridStore.stream(true); // auto close

                        return new P(function(resolve, reject)
                        {
                                res.on('finish', resolve);
                                stream.on('error', reject);
                                stream.pipe(res);
                        });
                })
                .catch(function(err)
                {
                        do404();
                        return null;
                });
        });
};
