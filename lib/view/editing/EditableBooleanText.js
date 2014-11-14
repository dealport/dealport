'use strict';
var domv = require('domv');

require('static-reference')('./style/EditableBooleanText.less');

function EditableBooleanText(node, value, falseContent, trueContent)
{
        domv.Component.call(this, node, 'span');

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
        e.preventDefault();
        this.value = !this.value;
};

EditableBooleanText.prototype._onKeydown = function(e)
{
        if (e.keyCode === 13 || // enter key
            e.keyCode === 32    // space
        )
        {
                e.preventDefault();
                this.value = !this.value;
        }
};
