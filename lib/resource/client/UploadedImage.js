'use strict';

//var P = require('bluebird');
var Resource = require('../Resource');

function UploadedImage(primus)
{
        Resource.call(this, primus, 'UploadedImage');


}

require('inherits')(UploadedImage, Resource);
module.exports = UploadedImage;

UploadedImage.prototype.updateCompanyLogo = function(companyId, file)
{
        // https://developer.mozilla.org/en-US/docs/Web/API/File
        // todo pipe stream
};