'use strict';
//var P = require('bluebird');
var Resource = require('../Resource');

function UploadedImage(primus, model, config, user)
{
        Resource.call(this, primus, 'UploadedImage');
        this.model = model;
        this.user = user;

        //this.listen(['something']);
}

require('inherits')(UploadedImage, Resource);
module.exports = UploadedImage;

UploadedImage.prototype.updateCompanyLogoChunk = function(companyId, bytes)
{
        // bytes is Uint8Array
};