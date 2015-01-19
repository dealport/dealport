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
var ObjectID = require('mongodb').ObjectID;

module.exports = function expressPluploadGridFS(dbConnOrDisposer)
{
        var getDB = dbConnOrDisposer;

        if (typeof dbConnOrDisposer !== 'function')
        {
                getDB = function()
                {
                        return P.resolve(dbConnOrDisposer).disposer(function(){});
                };
        }

        return function(req, res, next)
        {
                var plupload = req.plupload; // this object is the same for each chunk

                // Stream is already open?
                if (!plupload.isNew)
                {
                        req.once('end', function()
                        {
                                res.status(201).send(201);
                        });
                        return;
                }

                var user = req.user;
                var mimeType = req.get('Content-Type');

                if (!mimeType ||
                    !user)
                {
                        throw Error('This should have been checked previously');
                }

                if (!plupload.gridfsFileId)
                {
                        plupload.gridfsFileId = new ObjectID();
                }

                P.using(getDB(), function(db)
                {
                        // Otherwise it is a new file or a resume

                        // plupload.filename
                        // plupload.completedOffset
                        // plupload.stream

                        var gridStore = db.gridStore(
                                plupload.gridfsFileId,
                                'w+',
                                {
                                        root: 'uploadedImage',
                                        'content_type': mimeType,
                                        metadata: {
                                                createdByUser: user._id,
                                                userFileName: plupload.filename
                                        }
                                }
                        );

                        return gridStore.openAsync()
                        .then(function()
                        {
                                return gridStore.seekAsync(plupload.completedOffset); // (GridStore.IO_SEEK_SET)
                        })
                        .then(function()
                        {
                                return new P(function(resolve, reject)
                                {
                                        plupload.stream.on('data', function(data)
                                        {
                                                // todo max size check?

                                                plupload.stream.pause();

                                                gridStore.writeAsync(data)
                                                .then(function()
                                                {
                                                        plupload.stream.resume();
                                                })
                                                .catch(reject);
                                        });

                                        plupload.stream.on('end', function()
                                        {
                                                gridStore.closeAsync()
                                                .then(resolve, reject);
                                        });
                                });

                                // plupload FileUploaded event (uploader, file, {response: '{fileId: "f00"}'})
                        });

                })
                .then(function()
                {
                        res.status(201).json({
                                fileId: plupload.gridfsFileId.toString()
                        });
                })
                .catch(function(err)
                {
                        console.error('error while handling upload', err, err.stack);
                        res.status(500).send(err.stack);
                });

                // no next()
        };
};
