'use strict';
var domv = require('domv');

var MediaLogo = require('./MediaLogo');

require('static-reference')('./style/MediaButton.less');

function MediaButton(node, mediaName, href)
{
        domv.Component.call(this, node, 'a');

        if (this.isCreationConstructor(node))
        {
                var span = this.shorthand('span');

                this.cls('MediaButton');
                this.cls('m_' + mediaName);
                this.attr('href', href);
                this.appendChild(
                        new MediaLogo(this.document, mediaName, 'white', 29),
                        span('caption', mediaName.charAt(0).toUpperCase(), mediaName.slice(1))
                );
        }
        else
        {
                this.assertHasClass('MediaButton');
        }
}

module.exports = MediaButton;
require('inherits')(MediaButton, domv.Component);

