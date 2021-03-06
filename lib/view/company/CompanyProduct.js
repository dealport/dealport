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
var P = require('bluebird');

var EditablePlainText = require('./../editing/EditablePlainText');

require('static-reference')('./style/CompanyProduct.less');

function CompanyProduct(node, company)
{
        domv.Component.call(this, node, 'div');

        if (this.isCreationConstructor(node))
        {
                var h3 = this.shorthand('h3');

                this.cls('CompanyProduct');

                this.appendChild(
                        h3('title', 'Our product'),
                        this.desc = new EditablePlainText(this.document, {
                                tagName: 'p',
                                multiline: true,
                                placeholder: 'Describe the product of the company in detail',
                                value: company.productDesc
                        }).cls('desc')
                );
        }
        else
        {
                this.assertHasClass('CompanyProduct');
                this.desc = this.assertSelector('> .desc', EditablePlainText);
        }
}

module.exports = CompanyProduct;
require('inherits')(CompanyProduct, domv.Component);

Object.defineProperty(CompanyProduct.prototype, 'editing', {
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

CompanyProduct.prototype.attachEditingContexts = P.method(function(contextManager)
{
        return P.join(
                this.desc.attachEditingContext('productDesc', contextManager)
        );
});