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
var hrtime = require('../../swissarmyknife/hrtime');

require('static-reference')('./style/EditableBooleanText.less');

function EditableBooleanText(node, value, falseContent, trueContent)
{
        domv.Component.call(this, node, 'span');

        this.lastChangeByUser = null;

        if (this.isCreationConstructor(node))
        {
                //var div = this.shorthand('div');

                this.cls('EditableBooleanText');
                this.attr({
                        'data-false': falseContent || 'No',
                        'data-true': trueContent || 'Yes'
                });

                this.value = value;
        }
        else
        {
                this.assertHasClass('EditableBooleanText');
        }

        this.on('click', this._onClick);
        this.on('keydown', this._onKeydown);
}

module.exports = EditableBooleanText;
require('inherits')(EditableBooleanText, domv.Component);

EditableBooleanText.prototype.isChangedByUserSince = function(since)
{
        if (since === undefined ||
            since === null)
        {
                return true;
        }

        if (this.lastChangeByUser === null)
        {
                return false;
        }

        return this.lastChangeByUser > since;
};


Object.defineProperty(EditableBooleanText.prototype, 'falseContent', {
        configurable: true,
        get: function()
        {
                return this.getAttr('data-false');
        },
        set: function(value)
        {
                this.attr('data-false', value);
                this.value = this.value;
        }
});

Object.defineProperty(EditableBooleanText.prototype, 'trueContent', {
        configurable: true,
        get: function()
        {
                return this.getAttr('data-true');
        },
        set: function(value)
        {
                this.attr('data-true', value);
                this.value = this.value;
        }
});

Object.defineProperty(EditableBooleanText.prototype, 'value', {
        configurable: true,
        get: function()
        {
                return !!this.getAttr('data-value');
        },
        set: function(value)
        {
                value = !!value;
                this.attr('data-value', value);
                this.removeChildren();
                this.appendChild(value ? this.trueContent : this.falseContent);
        }
});

Object.defineProperty(EditableBooleanText.prototype, 'editing', {
        configurable: true,
        get: function()
        {
                return this.hasClass('editing');
        },
        set: function(value)
        {
                value = !!value;
                this.toggleClass('editing', value);
                this.attr('tabindex', value ? '0' : false);
        }
});

EditableBooleanText.prototype._onClick = function(e)
{
        if (!this.editing)
        {
                return;
        }

        e.preventDefault();

        var eventData = {
                targetComponent: this,
                newValue: !this.value
        };

        if (this.emit('domv-editable-change', eventData))
        {
                this.value = eventData.newValue;
                this.lastChangeByUser = hrtime();
        }
};

EditableBooleanText.prototype._onKeydown = function(e)
{
        if (!this.editing)
        {
                return;
        }
        
        if (e.keyCode === 13 || // enter key
            e.keyCode === 32    // space
        )
        {
                e.preventDefault();

                var eventData = {
                        targetComponent: this,
                        newValue: !this.value
                };

                if (this.emit('domv-editable-change', eventData))
                {
                        this.value = eventData.newValue;
                        this.lastChangeByUser = hrtime();
                }
        }
};
