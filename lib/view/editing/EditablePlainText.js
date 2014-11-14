'use strict';
var domv = require('domv');
var escapeHtml = require('bloody-escapehtml');
var swissarmyknife = require('../../swissarmyknife');

require('static-reference')('./style/EditablePlainText.less');

function preventListener(e)
{
        e.preventDefault();
}

function EditablePlainText(node, tagName, multiline, content)
{
        domv.Component.call(this, node, tagName || 'div');

        if (this.isCreationConstructor(node))
        {
                this.cls('EditablePlainText');
                this.multiline = multiline;
                this.appendChild(content);
        }
        else
        {
                this.assertHasClass('EditablePlainText');
                this.multiline = this.hasClass('multiline'); // adds listeners
        }

        this.addDomListener('paste', this._onPaste);

        // dragging text/or images might mess up the DOM of this element,
        // it might also mess up the DOM of adjacent elements.
        this.addDomListener('drag', preventListener);
        this.addDomListener('dragend', preventListener);
        this.addDomListener('dragenter', preventListener);
        this.addDomListener('dragleave', preventListener);
        this.addDomListener('dragover', preventListener);
        this.addDomListener('dragstart', preventListener);
        this.addDomListener('drop', preventListener);
}

module.exports = EditablePlainText;
require('inherits')(EditablePlainText, domv.Component);

Object.defineProperty(EditablePlainText.prototype, 'multiline', {
        configurable: true,
        get: function()
        {
                return this.hasClass('multiline');
        },
        set: function(value)
        {
                value = !!value;
                this.toggleClass('multiline', value);
                this.toggleClass('singleline', !value);
                if (value)
                {
                        this.removeDomListener('keydown', this._singlelineOnKeydown);
                }
                else
                {
                        this.addDomListener('keydown', this._singlelineOnKeydown);
                }
        }
});

Object.defineProperty(EditablePlainText.prototype, 'editing', {
        configurable: true,
        get: function()
        {
                return this.hasClass('editing');
        },
        set: function(value)
        {
                value = !!value;
                this.toggleClass('editing', value);
                this.attr('contentEditable', value ? 'true' : 'false');
        }
});

EditablePlainText.prototype._onPaste = function(e)
{
        var text;
        e.preventDefault();

        // filter all html
        if (this.editing)
        {
                if (e.clipboardData)
                {
                        text = e.clipboardData.getData('text/plain');// Sane browsers
                }
                else if (global.clipboardData)
                {
                        text = global.clipboardData.getData('Text'); // IE
                }
                else
                {
                        return;
                }

                text = escapeHtml(text);
                if (this.multiline)
                {
                        text = text.replace(/\r\n|[\r\n]/g, '<br/>'); // preserve enters
                }

                if (this.document.queryCommandSupported &&
                    this.document.queryCommandSupported('insertHTML'))
                {
                        this.document.execCommand('insertHTML', false, text);
                }
                else
                {
                        swissarmyknife.pasteHtmlAtCaret(global, text, false);
                }
        }
};

EditablePlainText.prototype._singlelineOnKeydown = function(e)
{
        console.log('keydown', e.keyCode);
        if (e.keyCode === 13) // enter key
        {
                e.preventDefault();
        }
};
