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

        // plupload args: (req.query)
        // name
        // chunk
        // chunks

        return function(req, res, next)
        {
                var user = req.user;
                var mimeType = req.query['Content-Type'];

                if (!mimeType ||
                    !user)
                {
                        throw Error('This should have been checked previously');
                }

                var fileId = new ObjectID();

                P.using(getDB(), function(db)
                {
                        var gridStore = db.gridStore(
                                fileId,
                                'w',
                                {
                                        root: 'uploadedImage',
                                        'content_type': mimeType,
                                        metadata: {
                                                createdByUser: user._id,
                                                userFileName: req.query.name
                                        }
                                }
                        );

                        return gridStore.openAsync()
                        /*.then(function()
                        {
                                return gridStore.seekAsync(plupload byte offset for chunking); // (GridStore.IO_SEEK_SET)
                        })*/
                        .then(function()
                        {
                                return new P(function(resolve, reject)
                                {
                                        req.on('data', function(data)
                                        {
                                                // todo max size check?

                                                req.pause();

                                                gridStore.writeAsync(data)
                                                .then(function()
                                                {
                                                        req.resume();
                                                })
                                                .catch(reject);
                                        });

                                        req.on('end', function()
                                        {
                                                gridStore.closeAsync()
                                                .then(resolve, reject);
                                        });
                                });
                        });

                })
                .then(function()
                {
                        console.log('User', user._id, 'uploaded a new file', fileId, mimeType);
                        res.status(201).json({
                                fileId: fileId.toString()
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
