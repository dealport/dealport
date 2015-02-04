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
var equal = require('deep-equal');

var hrtime = require('../../swissarmyknife/hrtime');
var Popup = require('../Popup');

require('static-reference')('./style/EditableDropDown.less');

function EditableDropDown(node, options, value)
{
        domv.Component.call(this, node, 'div');

        this.lastChangeByUser = null;
        this._sharePath = null;
        this._shareContext = null;
        this.options = [];
        this.popup = null; // lazy

        if (Array.isArray(options))
        {
                this.addOption(options);
        }

        if (this.isCreationConstructor(node))
        {
                //var div = this.shorthand('div');

                this.cls('EditableDropDown');
                this.value = value;
        }
        else
        {
                this.assertHasClass('EditableDropDown');
        }

        this.on('click', this._onClick);
        this.on('keydown', this._onKeydown);
}

module.exports = EditableDropDown;
require('inherits')(EditableDropDown, domv.Component);

EditableDropDown.prototype.addOption = function(value, label)
{
        if (this.popup)
        {
                throw Error('Not implemented yet'); // todo
        }

        if (Array.isArray(value))
        {
                value.forEach(function(option)
                {
                        this.addOption(
                                option.value,
                                option.label
                        );
                }, this);

                return;
        }

        if (label === void 123)
        {
                label = value + '';
        }

        this.options.push({value: value, label: label});
};

Object.defineProperty(EditableDropDown.prototype, 'open', {
        get: function()
        {
                return this.hasClass('open');
        },
        set: function(value)
        {
                this.toggleClass('open', !!value);

                if (value && !this.popup)
                {
                        this.popup = Popup.get(this);
                        this.popup.cls('EditableDropDown_Popup');
                        this.popup.alignTop = Popup.ALIGNMENT.BOTTOM;
                        this.popup.alignRight = Popup.ALIGNMENT.RIGHT;
                        this.popup.alignLeft = Popup.ALIGNMENT.LEFT;

                        var list = this.create('ul');
                        this.popup.list = list;
                        this.popup.appendChild(list);

                        this.options.forEach(function(option, index)
                        {
                                var li;
                                list.appendChild(
                                        li = list.create('li',
                                                { 'data-value': option.value,
                                                  tabindex    : 0 },
                                                option.label
                                        )
                                );

                                if (this.selectedIndex === index)
                                {
                                        li.cls('selected');
                                }
                        }, this);

                        list.on('click', this._onPopupListClick, false, this);
                        list.on('keydown', this._onPopupListKeydown, false, this);

                        this.popup.updatePositionNow();
                        this.popup.autoUpdatePosition();
                }
                else if (this.popup)
                {
                        if (value)
                        {
                                this.popup.addToAncestorOfOwner();
                                this.popup.updatePositionNow();
                                this.popup.autoUpdatePosition();
                        }
                        else
                        {
                                this.popup.removeNode();
                        }
                }
        }
});

Object.defineProperty(EditableDropDown.prototype, 'selectedIndex', {
        get: function()
        {
                var i = parseInt(this.getAttr('data-selected-index'), 10);
                return isNaN(i) ? null : i;
        },
        set: function(index)
        {
                var oldIndex = this.selectedIndex;
                index = (index * 1) || 0;
                if (index >= this.options.length)
                {
                        index = this.options.length - 1;
                }

                this.attr('data-selected-index', index);

                if (this.popup)
                {
                        var listItems = this.popup.list.children;
                        if (listItems[oldIndex])
                        {
                                listItems[oldIndex].removeClass('selected');
                        }

                        if (listItems[index])
                        {
                                listItems[index].addClass('selected');
                        }
                }

                this.removeChildren();

                var option = this.options[index];
                if (option)
                {
                        if (option.label &&
                            option.label.isDOMVComponent)
                        {
                                if (option.label.outerNode)
                                {
                                        this.appendChild(option.label.outerNode.cloneNode(true));
                                }
                        }
                        else
                        {
                                this.textContent = option.label;
                        }
                }
        }
});

Object.defineProperty(EditableDropDown.prototype, 'value', {
        get: function()
        {
                var option = this.options[this.selectedIndex];
                return option ? option.value : null;
        },
        set: function(value)
        {
                if (value === void 0 || value === null)
                {
                        this.selectedIndex = 0;
                        return;
                }

                for (var i = 0; i < this.options.length; ++i)
                {
                        var option = this.options[i];

                        if (equal(option.value, value, {strict: true}))
                        {
                                this.selectedIndex = i;
                                return;
                        }
                }

                // fallback, unknown option
                this.selectedIndex = 0;
        }
});

EditableDropDown.prototype.isChangedByUserSince = function(since)
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


Object.defineProperty(EditableDropDown.prototype, 'editing', {
        configurable: true,
        get: function()
        {
                return this.hasClass('editing');
        },
        set: function(value)
        {
                value = !!value;
                this.toggleClass('editing', value);
                this.attr('tabindex', value ? '0' : null);
                if (!value)
                {
                        this.open = false;
                }
        }
});

EditableDropDown.prototype._onClick = function(e)
{
        if (this.editing)
        {
                this.open = !this.open;
        }
};

EditableDropDown.prototype._onKeydown = function(e)
{
        if (this.editing)
        {
                if (e.keyCode === 13 || // enter key
                    e.keyCode === 32)  // space key
                {
                        e.preventDefault();
                        this.open = !this.open;
                }
                else if (e.keyCode === 0x26 || e.keyCode === 0x28) // arrow up & down
                {
                        e.preventDefault();
                        var first = this.popup.list.firstElementChild;
                        if (first)
                        {
                                first.focus = true;
                        }
                }
        }
};

EditableDropDown.prototype._onPopupListClick = function(e)
{
        var target = domv.wrap(e.target);
        while (target.outerNodeName !== 'li')
        {
                target = target.parentNode;
                if (!target)
                {
                        return; // not within a <li>
                }
        }

        var oldValue = this.value;
        this.selectedIndex = target.childrenIndex;
        var newValue = this.value;
        this.open = false;
        this.focus = true;
        this._changedByUser(oldValue, newValue);
};

EditableDropDown.prototype._onPopupListKeydown = function(e)
{
        var target = domv.wrap(e.target);
        while (target.outerNodeName !== 'li')
        {
                target = target.parentNode;
                if (!target)
                {
                        return; // not within a <li>
                }
        }

        if (e.keyCode === 13 || // enter key
            e.keyCode === 32)  // space key
        {
                e.preventDefault();
                var oldValue = this.value;
                this.selectedIndex = target.childrenIndex;
                var newValue = this.value;
                this.open = false;
                this.focus = true;
                this._changedByUser(oldValue, newValue);
        }
        else if (e.keyCode === 0x28) // arrow down
        {
                e.preventDefault();
                var next = target.nextElementSibling;
                if (!next)
                {
                        next = target.parentNode.firstElementChild;
                }
                next.focus = true;
        }
        else if (e.keyCode === 0x26) // arrow up
        {
                e.preventDefault();
                var prev = target.previousElementSibling;
                if (!prev)
                {
                        prev = target.parentNode.lastElementChild;
                }
                prev.focus = true;
        }
};


EditableDropDown.prototype._changedByUser = function(oldValue, newValue)
{
        if (equal(oldValue, newValue, {strict: true}))
        {
                return;
        }

        var eventData = {
                targetComponent: this,
                newValue: newValue
        };

        this.value = eventData.newValue;
        this.lastChangeByUser = hrtime();

        if (this._shareContext)
        {
                var op = {
                        p : [this._sharePath],
                        od: oldValue,
                        oi: newValue
                };

                this._shareContext.submitOp(op);
        }
};

EditableDropDown.prototype.attachEditingContext = P.method(function(path, contextFactory)
{
        this._sharePath = null;

        if (this._shareContext)
        {
                this._shareContext._onOp = null;
                this._shareContext.destroy();
                this._shareContext = null;
        }

        if (!contextFactory)
        {
                return false;
        }

        // assume the factory is bound to an id
        return contextFactory.get()
        .bind(this)
        .then(function(context)
        {
                this._sharePath = path;
                this._shareContext = context;
                this._shareContext._onOp = this._contextOnOp.bind(this); // _onOp(opData.op)

                return true;
        });
});

EditableDropDown.prototype._contextOnOp = function(components)
{
        components.forEach(function(comp)
        {
                if (comp.p[0] !== this._sharePath)
                {
                        // not for me
                        return;
                }

                this.handleOperationComponent(comp);
        }, this);
};

EditableDropDown.prototype.handleOperationComponent = function(comp)
{
        if ('oi' in comp)
        {
                this.value = comp.oi;
        }
        else if ('od' in comp) // only a remove
        {
                this.value = null;
        }
};