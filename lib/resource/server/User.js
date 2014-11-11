'use strict';
var P = require('bluebird');
var Resource = require('../Resource');

function User(primus, model, config, user)
{
        Resource.call(this, primus, 'User');
        this.model = model;
        this.user = user;

        this.listen(['sessionUser']);
}

require('inherits')(User, Resource);
module.exports = User;

User.prototype.sessionUser = function()
{
        //var model = this.model;
        var user = this.user;

        if (!user)
        {
                return P.resolve(null);
        }

        return P.resolve({
                _id: user._id && user._id.toString(),
                displayName: user.displayName,
                email: user.email
        });
};
