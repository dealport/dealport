'use strict';

//var P = require('bluebird');
var Resource = require('../Resource');

function CompanySubmit(primus)
{
        Resource.call(this, primus, 'CompanySubmit');
}

require('inherits')(CompanySubmit, Resource);
module.exports = CompanySubmit;

CompanySubmit.prototype.submit = function(formData)
{
        return this.rpc('submit', formData);
};
