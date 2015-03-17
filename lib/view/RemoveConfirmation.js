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

var StateAnchor = require('./StateAnchor');
require('static-reference')('./style/RemoveConfirmation.less');

function RemoveConfirmation(node, urlStateMap, what, cancelState)
{
        domv.Component.call(this, node, 'div');

        if (this.isCreationConstructor(node))
        {
                var div = this.shorthand('div');
                var button = this.shorthand('button');
                var p = this.shorthand('p');

                this.cls('RemoveConfirmation');
                this.appendChild(
                        p('confirm', 'Are you really sure you would like to delete this ', what, '?'),
                        p('confirm', 'You will lose ALL DATA associated with this ', what),
                        div('buttons',
                                this.removeButton = button('remove', 'Remove'),
                                this.cancelButton = new StateAnchor(this.document, urlStateMap, cancelState, 'Cancel').cls('cancel')
                        )
                );
        }
        else
        {
                this.assertHasClass('RemoveConfirmation');
                this.removeButton = this.assertSelector('> .buttons > .remove');
                this.cancelButton = this.assertSelector('> .buttons > .cancel', StateAnchor, urlStateMap);
        }

        this.removeButton.on('click', this._removeOnClick, false, this);
}

module.exports = RemoveConfirmation;
require('inherits')(RemoveConfirmation, domv.Component);

RemoveConfirmation.prototype._removeOnClick = function(e)
{
        this.emit('domv-remove-confirmation', {removeConfirmation: this});
};