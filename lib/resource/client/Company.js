'use strict';

//var P = require('bluebird');
var Resource = require('../Resource');

function Company(primus)
{
        Resource.call(this, primus, 'Company');

        this._cache = { // contains Promises
                all: null
        };
}

require('inherits')(Company, Resource);
module.exports = Company;

Company.prototype.all = function()
{
        this._cache.all = this._cache.all || this.rpc('all');
        return this._cache.all;
};
