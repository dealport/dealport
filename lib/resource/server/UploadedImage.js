'use strict';
//var P = require('bluebird');
var Resource = require('../Resource');

function UploadedImage(primus, model, config, user)
{
        Resource.call(this, primus, 'UploadedImage');
        this.model = model;
        this.user = user;

        this.listen(['clearCompanyLogo', 'updateCompanyLogoStart', 'updateCompanyLogoEnd']);
}

require('inherits')(UploadedImage, Resource);
module.exports = UploadedImage;

UploadedImage.prototype.clearCompanyLogo = function(companyId)
{
        // todo
};

UploadedImage.prototype.updateCompanyLogoStart = function(companyId)
{
        var channelData = this.currentChannelData;
        channelData.fileSizeSoFar = 0;
        console.log('updateCompanyLogoStart', companyId);

        channelData.onData = function(data)
        {
                if (!(data instanceof Uint8Array))
                {
                        return; // primus-emitter event
                }

                channelData.fileSizeSoFar += data.length;
                console.log('received some stuff', data.length, Object.getPrototypeOf(data).constructor.name);
                // todo
        }.bind(this);

        channelData.channelSpark.on('data', channelData.onData);
};
UploadedImage.prototype.updateCompanyLogoEnd = function(success)
{
        var channelData = this.currentChannelData;
        console.log('updateCompanyLogoEnd', success, channelData.fileSizeSoFar);
        channelData.channelSpark.removeListener('data', channelData.onData);
        channelData.onData = null;

        // todo check if file size is within limits again
        // todo UploadedImage.maxFileSize
};