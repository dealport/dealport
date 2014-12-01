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

var MediaLogo = require('./MediaLogo');

require('static-reference')('./style/MediaButton.less');

function MediaButton(node, mediaName, href)
{
        domv.Component.call(this, node, 'a');

        if (this.isCreationConstructor(node))
        {
                var span = this.shorthand('span');

                this.cls('MediaButton');
                this.cls('m_' + mediaName);
                this.attr('href', href);
                this.appendChild(
                        new MediaLogo(this.document, mediaName, 'white', 29),
                        span('caption', mediaName.charAt(0).toUpperCase(), mediaName.slice(1))
                );
        }
        else
        {
                this.assertHasClass('MediaButton');
        }
}

module.exports = MediaButton;
require('inherits')(MediaButton, domv.Component);

