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

module.exports = function expressGridFS(dbConnOrDisposer, maxAge)
{
        var getDB = dbConnOrDisposer;

        if (typeof dbConnOrDisposer !== 'function')
        {
                getDB = function()
                {
                        return P.resolve(dbConnOrDisposer).disposer(function(){});
                };
        }

        return function(req, res)
        {
                var id = req.url && req.url.slice(1);

                function do404()
                {
                        res.statusCode = 404;
                        res.setHeader('Content-Type', 'text/plain; charset=UTF-8');
                        res.end('404');
                }

                return P.using(getDB(), function(db)
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
};