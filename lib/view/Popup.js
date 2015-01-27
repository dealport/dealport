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
var shortId = require('shortid');
var lazyTimer = require('lazy-timer');

require('static-reference')('./style/Popup.less');

function Popup(node)
{
        domv.Component.call(this, node, 'div');

        this.owner = null;

        if (this.isCreationConstructor(node))
        {
                //var div = this.shorthand('div');

                this.cls('Popup');
                this.attr('id', 'Popup' + shortId.generate());
        }
        else
        {
                this.assertHasClass('Popup');
        }

        // call to schedule a position update (once)
        this.updatePosition = lazyTimer(10, false, this, this.updatePositionNow);

        // call to keep scheduling position updates until this popup is no longer part of the document
        // or no longer visible
        this.autoUpdatePosition = lazyTimer(10, false, this, this._autoUpdatePositionImpl);
}

module.exports = Popup;
require('inherits')(Popup, domv.Component);

Popup.ALIGNMENT = {
        NONE  : null,
        TOP   : 'top',
        RIGHT : 'right',
        BOTTOM: 'bottom',
        LEFT  : 'left'
};

Popup.findAncestorElement = function(owner)
{
        var ancestor = owner;

        if (!owner)
        {
                return null;
        }

        while (ancestor.parentNode &&
               ancestor.parentNode.outerNodeType === domv.NodeType.ELEMENT)
        {
                if (ancestor.outerNodeName === 'body')
                {
                        break;
                }

                ancestor = ancestor.parentNode;
        }

        if (ancestor.isOuterNodeEqual(owner))
        {
                return null;
        }

        return ancestor;
};

Popup.get = function(owner)
{
        if (!owner)
        {
                return null;
        }

        var id = owner && owner.getAttr('data-domv-popup-id');

        var ancestor = Popup.findAncestorElement(owner);
        var popup = null;

        if (!ancestor)
        {
                return null;
        }

        if (id)
        {
                popup = ancestor.outerNode.getElementById(id);
        }

        if (!popup)
        {
                popup = new Popup(owner.document);
                ancestor.appendChild(popup);
                owner.attr('data-domv-popup-id', popup.id);
        }

        popup.owner = owner;

        return popup;
};

Popup.prototype.addToAncestorOfOwner = function()
{
        var ancestor = Popup.findAncestorElement(this.owner);
        if (ancestor)
        {
                ancestor.appendChild(this);
        }
};

Object.defineProperty(Popup.prototype, 'id', {
        get: function()
        {
                return this.getAttr('id');
        }
});

Object.defineProperty(Popup.prototype, 'alignTop', {
        get: function()
        {
                return this.getAttr('data-align-top');
        },
        set: function(value)
        {
                this.attr('data-align-top', value);
        }
});

Object.defineProperty(Popup.prototype, 'alignRight', {
        get: function()
        {
                return this.getAttr('data-align-right');
        },
        set: function(value)
        {
                this.attr('data-align-right', value);
        }
});

Object.defineProperty(Popup.prototype, 'alignBottom', {
        get: function()
        {
                return this.getAttr('data-align-bottom');
        },
        set: function(value)
        {
                this.attr('data-align-bottom', value);
        }
});

Object.defineProperty(Popup.prototype, 'alignLeft', {
        get: function()
        {
                return this.getAttr('data-align-left');
        },
        set: function(value)
        {
                this.attr('data-align-left', value);
        }
});

Popup.prototype.updatePositionNow = function()
{
        var document = this.document;
        var ownerOuter = this.owner && this.owner.outerNode;

        if (!ownerOuter)
        {
                return;
        }

        var rect = ownerOuter.getBoundingClientRect();

        var html = document.documentElement;
        /*var body = document.body || document.getElementsByTagName('body')[0];

        var scroll = {
                top   : html.scrollTop  || body.scrollTop ,
                left  : html.scrollLeft || body.scrollLeft
        };
        scroll.right = scroll.left + html.clientWidth;
        scroll.bottom = scroll.top + html.clientHeight;*/

        var align = {
                top   : this.alignTop,
                right : this.alignRight,
                bottom: this.alignBottom,
                left  : this.alignLeft
        };

        var popupRect = {};

        Object.keys(align).forEach(function(side)
        {
                if (!align[side])
                {
                        this.style[side] = null;
                        popupRect[side] = null;
                        return;
                }

                popupRect[side] = rect[align[side]];

                if (side === 'right')
                {
                        this.style[side] = (html.clientWidth - popupRect[side]) + 'px';
                }
                else if (side === 'bottom')
                {
                        this.style[side] = (html.clientHeight - popupRect[side]) + 'px';
                }
                else
                {
                        this.style[side] = popupRect[side] + 'px';
                }
        }, this);

        if (popupRect.left && popupRect.right === null)
        {
                this.style.maxWidth = html.clientWidth - popupRect.left + 'px';
        }
        else if (popupRect.left === null && popupRect.right)
        {
                this.style.maxWidth = popupRect.right + 'px';
        }
        else
        {
                this.style.maxWidth = null;
        }

        if (popupRect.top && popupRect.bottom === null)
        {
                this.style.maxHeight = html.clientHeight - popupRect.top + 'px';
        }
        else if (popupRect.top === null && popupRect.bottom)
        {
                this.style.maxHeight = popupRect.bottom + 'px';
        }
        else
        {
                this.style.maxHeight = null;
        }
};


Popup.prototype._autoUpdatePositionImpl = function()
{
        var document = this.document;

        /*jshint -W016*/
        if (document.compareDocumentPosition(this.outerNode) & 1) // DOCUMENT_POSITION_DISCONNECTED = 1
        {
                return;
        }
        /*jshint +W016*/

        this.updatePositionNow();

        this.autoUpdatePosition();
};