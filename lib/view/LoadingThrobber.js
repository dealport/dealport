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

require('static-reference')('./style/LoadingThrobber.less');

function LoadingThrobber(node, size)
{
        var n;
        domv.Component.call(this, node, 'div');

        if (this.isCreationConstructor(node))
        {
                this.cls('LoadingThrobber');
                this.cls('s' + (size || 50));

                for (n = 1; n <= 8; ++n)
                {
                        this.appendChild(this.create('div', 'g'+n));
                }
        }
        else
        {
                this.assertHasClass('LoadingThrobber');
        }
}

module.exports = LoadingThrobber;
require('inherits')(LoadingThrobber, domv.Component);
