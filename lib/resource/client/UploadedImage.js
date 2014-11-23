'use strict';

var P = require('bluebird');
var Resource = require('../Resource');
var ReadableBlobStream = require('readable-blob-stream');

function UploadedImage(primus)
{
        Resource.call(this, primus, 'UploadedImage', 1); // only 1 channel
}

require('inherits')(UploadedImage, Resource);
module.exports = UploadedImage;

UploadedImage.prototype.updateCompanyLogo = function(companyId, file)
{
        if (!file)
        {
                return this.rpc('clearCompanyLogo', companyId);
        }

        // exclusive channel spark
        P.using(this.acquireChannelSparkForSending(true), function(channelSpark)
        {
                var success = false;

                return this.channelRpc(channelSpark, 'updateCompanyLogoStart', companyId)
                .bind(this)
                .then(function()
                {
                        return new P(function(resolve, reject)
                        {
                                var stream = new ReadableBlobStream(file);

                                stream.on('error', function(err)
                                {
                                        reject(err);
                                });

                                stream.on('end', function()
                                {
                                        console.log('there will be no more data.');
                                        success = true;
                                        resolve();
                                }.bind(this));

                                stream.pipe(channelSpark, {end: false}); // todo "back pressure" isn't handled in primus???

                        }.bind(this));

                })
                .finally(function()
                {
                        return this.channelRpc(channelSpark, 'updateCompanyLogoEnd', success);
                });
        }.bind(this));
};