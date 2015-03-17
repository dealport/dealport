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
var MediaButton = require('../MediaButton');

require('static-reference')('./style/LoginPage.less');

function LoginPage(node, urlStateMap)
{
        domv.Component.call(this, node, 'div');

        if (this.isCreationConstructor(node))
        {
                //var div = this.shorthand('div');

                this.cls('LoginPage');
                this.title = 'Login';

                var div = this.shorthand('div');
                var p = this.shorthand('p');
                var h2 = this.shorthand('h2');

                this.appendChild(
                        div('wrap',
                                h2('title', 'How would you like to login?'),
                                p('howto',
                                        'You can use your profile from other websites. ',
                                        'Simply click on the correct logo:'
                                ),
                                new MediaButton(this.document, 'facebook', '/auth/facebook')
                        )
                );
        }
        else
        {
                this.assertHasClass('LoginPage');

        }
}

module.exports = LoginPage;
require('inherits')(LoginPage, domv.Component);

