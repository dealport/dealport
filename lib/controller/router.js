/*
 * DealPort
 * Copyright (c) 2014  DealPort B.V.
 *
 * This file is part of DealPort
 *
 * DealPort is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, version 3 of the License.
 *
 * DealPort is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with DealPort.  If not, see <http://www.gnu.org/licenses/>.
 *
 * In addition, the following supplemental terms apply, based on section 7 of
 * the GNU Affero General Public License (version 3):
 * a) Preservation of all legal notices and author attributions
 */

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

function NamedEntity(name)
{
        this.type = 'NamedEntity';
        this.stateName = 'NamedEntity';
        this.name = name + '';
}
module.exports.NamedEntity = NamedEntity;

NamedEntity.prototype.isStateEqual = function(other)
{
        return this.type === other.type &&
               this.name === other.name;
};

function NamedVacancy(companyName, vacancyName)
{
        this.type = 'NamedVacancy';
        this.stateName = 'vacancy';
        this.companyName = companyName + '';
        this.vacancyName = vacancyName + '';
}
module.exports.NamedVacancy = NamedVacancy;

NamedVacancy.prototype.isStateEqual = function(other)
{
        return this.type === other.type &&
               this.companyName === other.companyName &&
               this.vacancyName === other.vacancyName;
};

/**
 * States are placed in the history API which causes serialization by the browser.
 * This method is called upon states right after they are retrieved from the history API.
 * See {@link https://developer.mozilla.org/en-US/docs/Web/Guide/API/DOM/The_structured_clone_algorithm}
 * @param {ControllerState} state
 * @returns {ControllerState}
 */
module.exports.wakeup = function(state)
{
        var newState;
        if (!state)
        {
                return state;
        }

        if (state.type === 'NamedEntity')
        {
                newState = new NamedEntity();
                copyKeys(state, newState);
        }

        if (state.type === 'NamedVacancy')
        {
                newState = new NamedVacancy();
                copyKeys(state, newState);
        }

        return newState || state;
};

/**
 * Parse an url into a state list.
 * The relation between parse and url is defined as such that:
 * <code>router.stringify(router.parse(url)) === url</code>
 * (unless the given url does not resolve to a state that exists)
 * @param {String} url
 * @returns {ControllerStateList}
 */
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
        else if (parts[0] === 'login')
        {
                return ['login'];
        }

        // dealport.co/bluehorizon
        var namedEntity = new NamedEntity(decodeURIComponent(parts[0]));
        if (!parts[1])
        {
                return ['page', namedEntity, 'none'];
        }
        else if (parts[1] === 'vacancy')
        {
                // dealport.co/bluehorizon/vacancy/awesome-job
                if (parts[2])
                {
                        var namedVacancy = new NamedVacancy(namedEntity.name, decodeURIComponent(parts[2]));
                        return ['page', namedVacancy];
                }
        }

        return ['404'];
};

/**
 * Parse a state list into an URL string.
 * The relation between parse and url is defined as such that:
 * <code>router.parse(router.stringify(states)) equals states</code>
 * (unless the given state is not valid)
 * @param {ControllerStateList} states
 * @returns {String} url
 */
module.exports.stringify = function(states)
{
        if (states[0] === 'page' && states[1])
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
                }
                else if (states[1].type === 'NamedEntity')
                {
                        if (states[2] === 'none')
                        {
                                return '/' + encodeURIComponent(states[1].name);
                        }
                }
                else if (states[1].type === 'NamedVacancy')
                {
                        return '/' + encodeURIComponent(states[1].companyName)
                               + '/vacancy/' + encodeURIComponent(states[1].vacancyName);

                }
        }
        else if (states[0] === 'login')
        {
                return '/login';
        }

        return null;
};

/**
 * Compare the previous state and the newState to determine whether a state transition
 * between these two states should result in a new history entry in the browser.
 * To be specific, returning false means history.replaceState is used, returning true
 * uses history.pushState
 * @param {ControllerStateList} prev
 * @param {ControllerStateList} next
 * @returns {boolean}
 */
module.exports.isNewHistoryState = function(prev, next)
{
        return true;
};