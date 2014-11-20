'use strict';
var domv = require('domv');
var EditablePlainText = require('./EditablePlainText');
var lazyTimer = require('lazy-timer');

require('static-reference')('./style/EditablePlainAnchor.less');

function generateID()
{
        generateID.id = (generateID.id || 0) + 1;
        if (generateID.id >= 9007199254740992) { generateID.id = -9007199254740992; }
        return generateID.prefix + generateID.id;
}
generateID.prefix = Math.floor(Math.random() * 10000000) + 'l';

function EditablePlainAnchor(node, value, hrefValue)
{
        EditablePlainText.call(this, node, 'a', false, value);

        if (this.isCreationConstructor(node))
        {
                //var div = this.shorthand('div');

                this.cls('EditablePlainAnchor');
                this.attr('data-ref', generateID());
                this.hrefValue = hrefValue;
                this.hrefEditPopup = null; // lazy
                this.hrefEditInput = null;
        }
        else
        {
                this.assertHasClass('EditablePlainAnchor');
                this.hrefEditPopup = domv.wrap(this.document)
                        .selector('.EditablePlainAnchor_hrefEditPopup[data-ref='+domv.cssStringEscape(this.getAttr('data-ref'))+']');
                this.hrefEditInput = this.hrefEditPopup && this.hrefEditPopup.assertSelector('> label > input');
        }

        // timer ensures the browser takes care of the focus transition first
        this.updateHrefEditVisible = lazyTimer(1, false, this, this._updateHrefEditVisibleImpl);
        this.hrefEditInputChanged = lazyTimer(10, false, this, this._hrefEditInputChangedImpl);
        this.updateHrefEditPosition = lazyTimer(10, false, this, this._updateHrefEditPositionImpl);
        this.on('focus', this.updateHrefEditVisible, true);
        this.on('blur', this.updateHrefEditVisible, true);
}

module.exports = EditablePlainAnchor;
require('inherits')(EditablePlainAnchor, EditablePlainText);

Object.defineProperty(EditablePlainAnchor.prototype, 'hrefValue', {
        configurable: true,
        get: function()
        {
                return this.getAttr('href');
        },
        set: function(value)
        {
                this.attr('href', value);
        }
});

Object.defineProperty(EditablePlainAnchor.prototype, 'hrefEditVisible', {
        configurable: true,
        get: function()
        {
                return this.hrefEditPopup &&
                       this.hrefEditPopup.style.display === 'block';
        },
        set: function(value)
        {
                if (value &&
                    !this.hrefEditPopup)
                {
                        this.hrefEditPopup = this.create('div', 'EditablePlainAnchor_hrefEditPopup',
                                {'data-ref': this.getAttr('data-ref')},
                                this.create('label',
                                        this.create('span', '', 'URL: '),
                                        this.hrefEditInput = this.create('input', {type: 'url', value: this.hrefValue})
                                )
                        );
                        domv.wrap(this.document.body).appendChild(this.hrefEditPopup);

                        this.hrefEditPopup.on('click', function(e)
                        {
                                e.preventDefault();
                                e.stopPropagation();
                                this.hrefEditInput.outerNode.focus();
                        }, false, this);

                        this.hrefEditInput.on('keydown', this.hrefEditInputChanged);
                        this.hrefEditInput.on('paste', this.hrefEditInputChanged);
                        this.hrefEditInput.on('cut', this.hrefEditInputChanged);
                        this.hrefEditInput.on('change', this.hrefEditInputChanged);
                        this.hrefEditPopup.on('focus', this.updateHrefEditVisible, true);
                        this.hrefEditPopup.on('blur', this.updateHrefEditVisible, true);
                }

                if (this.hrefEditPopup)
                {
                        this.hrefEditPopup.style.display = value ? 'block' : null;
                }
        }
});

EditablePlainAnchor.prototype._updateHrefEditVisibleImpl = function()
{
        var focused = false;

        var node = this.document.activeElement;
        while (node)
        {
                if (node === this.outerNode ||
                    node === this.hrefEditPopup.outerNode)
                {
                        focused = true;
                        break;
                }
                node = node.parentNode;
        }

        this.hrefEditVisible = this.editing && focused;

        this.updateHrefEditPosition();
};

EditablePlainAnchor.prototype._hrefEditInputChangedImpl = function()
{
        this.hrefValue = this.hrefEditInput.value;
        this.updateHrefEditPosition();
        this.fireChangeEvent();
};

EditablePlainAnchor.prototype._updateHrefEditPositionImpl = function()
{
        var document = this.document;

        /*jshint -W016*/
        if (!this.hrefEditVisible ||
            !this.outerNode.getBoundingClientRect ||
            document.compareDocumentPosition(this.outerNode) & 1) // DOCUMENT_POSITION_DISCONNECTED = 1
        {
                return;
        }
        /*jshint +W016*/

        // make sure this timer keeps running unless the edit panel is no longer visible
        // or if this element is no longer part of the document
        this.updateHrefEditPosition();

        var scroll = {
                top: document.documentElement.scrollTop || document.body.scrollTop,
                left: document.documentElement.scrollLeft || document.body.scrollLeft
        };
        var rect = this.outerNode.getBoundingClientRect();

        var pos = {
                top: rect.top + scroll.top,
                left: rect.left + scroll.left
        };

        pos.left -= 50;
        pos.left = Math.max(0, pos.left);
        pos.top = Math.max(0, pos.top);

        this.hrefEditPopup.style.top = pos.top + 'px';
        this.hrefEditPopup.style.left = pos.left + 'px';
};