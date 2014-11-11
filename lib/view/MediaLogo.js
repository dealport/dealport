'use strict';
var domv = require('domv');

require('static-reference')('./style/MediaLogo.less');

function MediaLogo(node, mediaName, style, size)
{
        domv.Component.call(this, node, 'span');

        if (this.isCreationConstructor(node))
        {
                //var div = this.shorthand('div');

                this.cls('MediaLogo');
                this.cls(style || 'normal');
                this.cls('m_'+mediaName);
                this.cls('s_' + (size || 29));
        }
        else
        {
                this.assertHasClass('MediaLogo');

        }
}

module.exports = MediaLogo;
require('inherits')(MediaLogo, domv.Component);

