'use strict';
var domv = require('domv');
//var StateAnchor = require('../StateAnchor');

require('static-reference')('./style/HomePage.less');

function HomePage(node, router)
{
        domv.Component.call(this, node);

        if (this.isCreationConstructor(node))
        {
                this.cls('HomePage');
                this.title = 'Home';

                var p = this.shorthand('p');
                var h2 = this.shorthand('h2');

                this.appendChild(
                        h2('title', 'DealPort'),
                        p('', ' Quisque ut mi justo. Aliquam sit amet ipsum scelerisque, eleifend magna et, egestas ipsum. Sed eget mi enim. Etiam nec velit ullamcorper, convallis risus eu, blandit leo. Pellentesque at ornare massa. Nullam condimentum tempus mauris, sed laoreet orci tristique non. Curabitur molestie justo mauris, a finibus diam pharetra eu. Maecenas hendrerit est id leo ullamcorper gravida. Mauris ultricies ex libero, tincidunt hendrerit ex consequat sit amet. Curabitur ullamcorper molestie hendrerit. Aenean ac lorem turpis. Integer mollis condimentum dolor, quis laoreet massa semper non. Sed commodo ornare lectus eu luctus. Vestibulum in posuere lorem. ')
                );
        }
        else
        {
                this.assertHasClass('HomePage');
        }
}

module.exports = HomePage;
require('inherits')(HomePage, domv.Component);
