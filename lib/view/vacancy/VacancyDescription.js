/*
 * DealPort
 * Copyright (c) 2015  DealPort B.V.
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

var P = require('bluebird');

var EditablePlainText = require('./../editing/EditablePlainText');

require('static-reference')('./style/VacancyDescription.less');

function VacancyDescription(node, vacancy)
{
        domv.Component.call(this, node, 'div');

        if (this.isCreationConstructor(node))
        {
                var h3 = this.shorthand('h3');

                this.cls('VacancyDescription');

                this.appendChild(
                        h3('title', 'Description'),
                        this.desc = new EditablePlainText(this.document, 'p', true, vacancy.description + '').cls('desc')
                );
        }
        else
        {
                this.assertHasClass('VacancyDescription');
                this.desc = this.assertSelector('> .desc', EditablePlainText);
        }
}

module.exports = VacancyDescription;
require('inherits')(VacancyDescription, domv.Component);


Object.defineProperty(VacancyDescription.prototype, 'editing', {
        configurable: true,
        get: function()
        {
                return this.hasClass('editing');
        },
        set: function(value)
        {
                value = !!value;
                this.toggleClass('editing', value);
                this.desc.editing = value;
        }
});

VacancyDescription.prototype.attachEditingContexts = P.method(function(contextFactory)
{
        return P.join(
                this.desc.attachEditingContext('description', contextFactory)
        );
});