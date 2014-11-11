'use strict';
var domv = require('domv');
var MediaButton = require('../MediaButton');

require('static-reference')('./style/LoginPage.less');

function LoginPage(node, router)
{
        domv.Component.call(this, node, 'div');

        if (this.isCreationConstructor(node))
        {
                //var div = this.shorthand('div');

                this.cls('LoginPage');
                this.title = 'Login';

                var div = this.shorthand('div');
                var p = this.shorthand('p');
                var h2 = this.shorthand('h2');

                this.appendChild(
                        div('wrap',
                                h2('title', 'How would you like to login?'),
                                p('howto',
                                        'You can use your profile from other websites. ',
                                        'Simply click on the correct logo:'
                                ),
                                new MediaButton(this.document, 'facebook', '/auth/facebook')
                        )
                );
        }
        else
        {
                this.assertHasClass('LoginPage');

        }
}

module.exports = LoginPage;
require('inherits')(LoginPage, domv.Component);

