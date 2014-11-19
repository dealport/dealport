'use strict';
//var P = require('bluebird');
var Resource = require('../Resource');

function User(primus, model, config, user)
{
        Resource.call(this, primus, 'User');
        this.model = model;
        this.user = user;

        //this.listen(['something']);
}

require('inherits')(User, Resource);
module.exports = User;

