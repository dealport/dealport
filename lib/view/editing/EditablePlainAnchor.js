'use strict';
var domv = require('domv');
var EditablePlainText = require('./EditablePlainText');
var lazyTimer = require('lazy-timer');

require('static-reference')('./style/EditablePlainAnchor.less');

function EditablePlainAnchor(node, value, hrefValue)
{
        EditablePlainText.call(this, node, 'a', false, value);

        if (this.isCreationConstructor(node))
        {
                //var div = this.shorthand('div');

                this.cls('EditablePlainAnchor');

                this.hrefValue = hrefValue;
        }
        else
        {
                this.assertHasClass('EditablePlainAnchor');
        }

        this.hrefEditPopup = null;
        this.hrefEditInput = null;

        // timer ensures the browser takes care of the focus transition first
        this.updateHrefEditVisible = lazyTimer(1, false, this, this._updateHrefEditVisibleImpl);
        this.hrefEditInputChanged = lazyTimer(10, false, this, this._hrefEditInputChangedImpl);
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
};


EditablePlainAnchor.prototype._hrefEditInputChangedImpl = function()
{
        this.hrefValue = this.hrefEditInput.value;
        this.fireChangeEvent();
};