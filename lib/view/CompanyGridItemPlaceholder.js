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

var StateAnchor = require('./StateAnchor');

require('static-reference')('./style/CompanyGridItemPlaceholder.less');

function CompanyGridItemPlaceholder(node, router)
{
        domv.Component.call(this, node, 'li');

        if (this.isCreationConstructor(node))
        {
                var p = this.shorthand('p');

                this.cls('CompanyGridItemPlaceholder');

                this.appendChild(this.anchor = new StateAnchor(this.document, router, ['page', 'home', 'submit'],
                        p('text', 'Submit a new company')
                ));
        }
        else
        {
                this.assertHasClass('CompanyGridItemPlaceholder');
                this.anchor = this.assertSelector('> .StateAnchor', StateAnchor, router);
        }
}

module.exports = CompanyGridItemPlaceholder;
require('inherits')(CompanyGridItemPlaceholder, domv.Component);
