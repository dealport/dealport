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

//require('static-reference')('./style/CaptionedValuesTable.less');

function CaptionedValuesTable(node)
{
        domv.Component.call(this, node, 'table');

        this.rows = Object.create(null);

        if (this.isCreationConstructor(node))
        {
                var colgroup = this.shorthand('colgroup');
                var col = this.shorthand('col');

                this.cls('CaptionedValuesTable');

                this.appendChild(colgroup(
                        col('caption'),
                        col('value')
                ));

                this.appendChild(this.tbody = this.create('tbody'));
                this.innerNode = this.tbody;
        }
        else
        {
                this.assertHasClass('CaptionedValuesTable');
                this.tbody = this.assertSelector('> tbody');

                this.tbody.selectorAll('> tr').forEach(function(row)
                {
                        row.caption = row.assertSelector('> .caption');
                        row.value = row.assertSelector('> .value');
                        row.innerNode = row.value;
                        
                        var key = row.getAttr('data-key');
                        if (key)
                        {
                                this.rows[key] = row;
                        }
                }, this);

                this.innerNode = this.tbody;
        }
}

module.exports = CaptionedValuesTable;
require('inherits')(CaptionedValuesTable, domv.Component);

CaptionedValuesTable.prototype.addRow = function(key, caption, value)
{
        var tr = this.shorthand('tr');
        var td = this.shorthand('td');
        var row;

        this.appendChild(row = tr({'data-key': key || null}));

        row.appendChild(
                row.caption = td('caption', caption),
                row.value = td('value', value)
        );

        row.innerNode = row.value;

        if (key)
        {
                this.rows[key] = row;
        }

        return row;
};
