'use strict';

//var P = require('bluebird');
var Resource = require('../Resource');

function User(primus)
{
        Resource.call(this, primus, 'User');

        this._cache = { // contains Promises
        };
}

require('inherits')(User, Resource);
module.exports = User;

