'use strict';

//var P = require('bluebird');
var Resource = require('../Resource');

function User(primus)
{
        Resource.call(this, primus, 'User');

        this._cache = { // contains Promises
                sessionUser: null
        };
}

require('inherits')(User, Resource);
module.exports = User;

User.prototype.sessionUser = function()
{
        this._cache.sessionUser = this._cache.sessionUser || this.rpc('sessionUser');
        return this._cache.sessionUser;
};
