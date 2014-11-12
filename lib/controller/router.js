'use strict';

var nodeUrl = require('url');
//var querystring = require('querystring');
//var deepEqual = require('deep-equal');

/*function queryStringify(qs)
{
        var o;
        for (o in qs)
        {
                if (qs[o] === undefined ||
                    qs[o] === null ||
                    qs[o].length === 0)
                {
                        delete qs[o];
                }
        }
        qs = querystring.stringify(qs);
        return qs ? '?' + qs : '';
}*/

function IDWithOptionalTitle(id, title)
{
        id = id.toString();
        this.stateName = id;
        this.id = id;
        this.title = title;
}
module.exports.IDWithOptionalTitle = IDWithOptionalTitle;

IDWithOptionalTitle.prototype.isStateEqual = function(other)
{
        return this.id === other.id;
};

module.exports.parse = function(url)
{
        var parts;

        url = nodeUrl.parse(url.trim(), true);
        parts = url.pathname.replace(/^\/|\/$/g, '').split('/');

        if (!parts[0])
        {
                return ['page', 'home', 'none'];
        }
        else if (parts[0] === 'submit')
        {
                return ['page', 'home', 'submit'];
        }
        else if (parts[0] === 'edit')
        {
                return ['page', 'home', 'edit'];
        }
        else if (parts[0] === 'login')
        {
                return ['login'];
        }

        return ['404'];
};


module.exports.stringify = function(states)
{
        if (states[0] === 'page')
        {
                if (states[1] === 'home')
                {
                        if (states[2] === 'none')
                        {
                                return '/';
                        }
                        else if (states[2] === 'submit')
                        {
                                return '/submit';
                        }
                        else if (states[2] === 'edit')
                        {
                                return '/edit';
                        }
                }
        }
        else if (states[0] === 'login')
        {
                return '/login';
        }

        return null;
};
