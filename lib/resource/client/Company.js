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


Company.prototype.updateCompany = function(id, values)
{
        // todo update cache

        var p = this.rpc('updateCompany', id, values);

        // The caller of updateCompany does not have to wait for this stuff:
        p.then(function(rpcReturn)
        {
                if (!this._cache.all ||
                    !this._cache.all.isFulfilled())
                {
                        return;
                }

                var keys = Object.keys(values);

                this._cache.all.value().forEach(function(item)
                {
                        if (item._id !== id)
                        {
                                return;
                        }

                        keys.forEach(function(key)
                        {
                                item[key] = values[key];
                        });
                });

        });

        return p;
};