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
var domv = require('domv');

function StateAnchor(node, router, state, content)
{
        var i;
        domv.Component.call(this, node, 'a');

        if (!router)
        {
                throw new domv.Exception(Error('new StateAnchor : router argument is required'));
        }
        this.router = router;

        if (this.isCreationConstructor(node))
        {
                this.cls('StateAnchor');
                this.state = state;

                for (i = 3; i < arguments.length; ++i)
                {
                        this.appendChild(arguments[i]);
                }
        }
        else
        {
                this.assertHasClass('StateAnchor');
        }

        this.on('click', this._click);
}

module.exports = StateAnchor;
require('inherits')(StateAnchor, domv.Component);

Object.defineProperty(StateAnchor.prototype, 'state', {
        get: function()
        {
                return this.router.parse(this.getAttr('href'));
        },
        set: function(value)
        {
                var url;

                if (value)
                {
                        url = this.router.stringify(value);
                        if (url === null || url === undefined)
                        {
                                throw domv.Exception(Error('Unknown state ' + value.join(', ')));
                        }
                        this.attr('href', url);
                }
                else
                {
                        this.attr('href', null);
                }
        }
});

StateAnchor.prototype.trigger = function()
{
        return !this.emit('domv-stateselect', {
                state: this.state,
                stateAnchor: this
        });
};

StateAnchor.prototype._click = function(e)
{
        var prevented;
        // this implementation has a useful side effect:
        // any StateAnchor which is not wrapped upon page load in the browser
        // will fallback to the default action for an <a href="..."> (visit the page).
        // this is a nice way to handle fallbacks for views which are not parseable for
        // some reason (e.g. an exception, or the visitor is using noscript)

        if (this.state &&
            domv.isLeftMouseButton(e))
        {
                e.stopImmediatePropagation();

                // bubble this to the documentElement which is where the magic happens
                prevented = this.trigger();

                if (prevented)
                {
                        // a listener of 'domv-stateselect' called e.preventDefault
                        e.preventDefault();
                }
        }
};