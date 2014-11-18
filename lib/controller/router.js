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

function copyKeys(source, target)
{
        Object.keys(source).forEach(function(key)
        {
                target[key] = source[key];
        });
}

function IDWithOptionalTitle(id, title)
{
        id = id + '';
        this.type = 'IDWithOptionalTitle';
        this.stateName = id;
        this.id = id;
        this.title = title;
}
module.exports.IDWithOptionalTitle = IDWithOptionalTitle;

IDWithOptionalTitle.prototype.isStateEqual = function(other)
{
        return this.type === other.type &&
               this.id === other.id;
};

/**
 * States are placed in the history API which causes serialization by the browser.
 * This method is called upon states right after they are retrieved from the history API.
 * See {@link https://developer.mozilla.org/en-US/docs/Web/Guide/API/DOM/The_structured_clone_algorithm}
 * @param state
 * @returns {*}
 */
module.exports.wakeup = function(state)
{
        var newState;
        if (!state)
        {
                return state;
        }

        if (state.type === 'IDWithOptionalTitle')
        {
                newState = new IDWithOptionalTitle();
                copyKeys(state, newState);
        }

        return newState || state;
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
