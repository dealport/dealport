'use strict';
var domv = require('domv');

require('static-reference')('./style/LoadingThrobber.less');

function LoadingThrobber(node, size)
{
        var n;
        domv.Component.call(this, node, 'div');

        if (this.isCreationConstructor(node))
        {
                this.cls('LoadingThrobber');
                this.cls('s' + (size || 50));

                for (n = 1; n <= 8; ++n)
                {
                        this.appendChild(this.create('div', 'g'+n));
                }
        }
        else
        {
                this.assertHasClass('LoadingThrobber');
        }
}

module.exports = LoadingThrobber;
require('inherits')(LoadingThrobber, domv.Component);
