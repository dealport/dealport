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
var ReadableBlobStream = require('readable-blob-stream');
var Sequencify = require('stream-sequencer').Sequencify;

function UploadedImage(primus, sharejsConn)
{
        Resource.call(this, primus, 'UploadedImage', 1); // only 1 channel
        this.sharejs = sharejsConn;
}

require('inherits')(UploadedImage, Resource);
module.exports = UploadedImage;

UploadedImage.maxByteSize = 1024 * 1024;

UploadedImage.prototype.updateCompanyLogo = function(companyId, file)
{
        var doc = this.sharejs.get('company', companyId);
        return doc.whenReadyAsync()
        .bind(this)
        .then(function()
        {
                var version = doc.version;
                if (!file)
                {
                        return this.rpc('clearCompanyLogo', companyId, version);
                }

                // exclusive channel spark
                P.using(this.acquireChannelSparkForSending(true), function(channelSpark)
                {
                        var lastSequenceID = null;

                        return this.channelRpc(channelSpark, 'updateCompanyLogoStart', companyId, file.type)
                        .bind(this)
                        .then(function()
                        {
                                return new P(function(resolve, reject)
                                {
                                        var stream = new ReadableBlobStream(file, {highWaterMark: 512 * 1024});
                                        var sequencify = new Sequencify();

                                        stream.on('error', function(err)
                                        {
                                                reject(err);
                                        });

                                        stream.on('end', function()
                                        {
                                                lastSequenceID = sequencify.lastSequenceID;
                                                resolve();
                                        }.bind(this));

                                        stream.pipe(sequencify).pipe(channelSpark, {end: false});

                                        // todo "back pressure" isn't handled in primus, this is very bad for large files

                                }.bind(this));

                        })
                        .finally(function()
                        {
                                return this.channelRpc(channelSpark, 'updateCompanyLogoEnd', lastSequenceID, version);
                        });
                }.bind(this));
        });
};

