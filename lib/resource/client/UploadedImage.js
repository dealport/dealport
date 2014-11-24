'use strict';

var P = require('bluebird');
var Resource = require('../Resource');
var ReadableBlobStream = require('readable-blob-stream');

function UploadedImage(primus, companyResource)
{
        Resource.call(this, primus, 'UploadedImage', 1); // only 1 channel
        this.companyResource = companyResource;
}

require('inherits')(UploadedImage, Resource);
module.exports = UploadedImage;

UploadedImage.maxByteSize = 1024 * 1024;

UploadedImage.prototype.updateCompanyLogo = function(companyId, file)
{
        var companyResource = this.companyResource;
        if (!file)
        {
                return this.rpc('clearCompanyLogo', companyId);
        }

        // exclusive channel spark
        P.using(this.acquireChannelSparkForSending(true), function(channelSpark)
        {
                return this.channelRpc(channelSpark, 'updateCompanyLogoStart', companyId, file.type)
                .bind(this)
                .then(function()
                {
                        return new P(function(resolve, reject)
                        {
                                var stream = new ReadableBlobStream(file, {highWaterMark: 512 * 1024});

                                stream.on('error', function(err)
                                {
                                        reject(err);
                                });

                                stream.on('end', function()
                                {
                                        resolve();
                                }.bind(this));

                                stream.pipe(channelSpark, {end: false});

                                // todo "back pressure" isn't handled in primus, this is very bad for large files

                        }.bind(this));

                })
                .finally(function()
                {
                        return this.channelRpc(channelSpark, 'updateCompanyLogoEnd').then(function(logoURL)
                        {
                                companyResource._updateLogoUrlInCache(companyId, logoURL);
                        });
                });
        }.bind(this));
};