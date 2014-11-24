'use strict';

module.exports = function(primus)
{
        var Company = new (require('./Company'))(primus);
        return {
                Company: Company,
                CompanySubmit: new (require('./CompanySubmit'))(primus),
                User: new (require('./User'))(primus),
                UploadedImage: new (require('./UploadedImage'))(primus, Company)
        };
};
