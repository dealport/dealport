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
//var domv = require('domv');

var EditablePlainText = require('./EditablePlainText');

//require('static-reference')('./style/EditableAutoLink.less');

function EditableAutoLink(node, value)
{
        EditablePlainText.call(this, node, {tagName: 'a', value: value, placeholder: 'http://example.com/'});

        if (this.isCreationConstructor(node))
        {
                this.cls('EditableAutoLink');
        }
        else
        {
                this.assertHasClass('EditableAutoLink');
        }

        this.on('domv-editable-change', this.updateHref);
}

module.exports = EditableAutoLink;
require('inherits')(EditableAutoLink, EditablePlainText);

EditableAutoLink.prototype.updateHref = function()
{
        var url = this.value;

        if (url)
        {
                // prevents stuff like javascript:
                if (!/^https?:\/\//.test(url))
                {
                        url = 'http://' + url;
                }
        }
        else
        {
                url = null; // remove attribute
        }

        this.attr('href', url);
};

var valueParent = Object.getOwnPropertyDescriptor(EditablePlainText.prototype, 'value');

Object.defineProperty(EditableAutoLink.prototype, 'value', {
        configurable: true,
        get: function()
        {
                return valueParent.get.apply(this, arguments);
        },
        set: function(url)
        {
                valueParent.set.apply(this, arguments);
                this.updateHref();
        }
});
