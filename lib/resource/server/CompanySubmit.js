'use strict';
var P = require('bluebird');
var Resource = require('../Resource');

function CompanySubmit(primus, model)
{
        Resource.call(this, primus, 'CompanySubmit');
        this.model = model;

        //this.listen(['submit']);
}

require('inherits')(CompanySubmit, Resource);
module.exports = CompanySubmit;

CompanySubmit.prototype.submit = function(formData)
{
        console.log('sending an e-mail!', formData);
        return P.resolve();
};
