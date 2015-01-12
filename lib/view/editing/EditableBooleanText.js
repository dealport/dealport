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

var hrtime = require('../../swissarmyknife/hrtime');

require('static-reference')('./style/EditableBooleanText.less');

function EditableBooleanText(node, value, falseContent, trueContent)
{
        domv.Component.call(this, node, 'span');

        this.lastChangeByUser = null;
        this._sharePath = null;
        this._shareContext = null;

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

EditableBooleanText.prototype.attachEditingContext = function(path, context)
{
        this._sharePath = null;

        if (this._shareContext)
        {
                this._shareContext._onOp = null;
                this._shareContext.destroy();
                this._shareContext = null;
        }

        if (!context)
        {
                return P.resolve(false);
        }

        if (context.isSharejsContextFactory)
        {
                // assume the factory is bound to an id
                return context.get()
                .bind(this)
                .then(function(context)
                {
                        return this.attachEditingContext(path, context);
                });
        }

        if (context._onOp)
        {
                throw Error('The given context is already in use');
        }

        if (context.remove)
        {
                throw Error('The given context has been destroyed');
        }

        this._sharePath = path;
        this._shareContext = context;
        this._shareContext._onOp = this._contextOnOp.bind(this); // _onOp(opData.op)
        // context.getSnapshot()
        // context.submitOp(op, callback)

        return P.resolve(true);
};

EditableBooleanText.prototype._contextOnOp = function(components)
{
        components.forEach(function(comp)
        {
                if (comp.p[0] !== this._sharePath)
                {
                        // not for me
                        return;
                }

                if ('oi' in comp)
                {
                        this.value = comp.oi;
                }
                else if ('od' in comp) // only a remove
                {
                        this.value = false;
                }
        }, this);
};

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

EditableBooleanText.prototype._changedByUser = function(newValue)
{
        var eventData = {
                targetComponent: this,
                newValue: newValue
        };

        if (this.emit('domv-editable-change', eventData))
        {
                this.value = eventData.newValue;
                this.lastChangeByUser = hrtime();
        }
};

EditableBooleanText.prototype._onClick = function(e)
{
        if (!this.editing)
        {
                return;
        }

        e.preventDefault();
        this._changedByUser(!this.value);
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
                this._changedByUser(!this.value);
        }
};
