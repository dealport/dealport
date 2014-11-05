'use strict';
var domv = require('domv');

require('static-reference')('./style/CompanyLogo.less');

function CompanyLogo(node, company)
{
        domv.Component.call(this, node, 'a');

        if (this.isCreationConstructor(node))
        {
                var img = this.shorthand('img');

                this.cls('CompanyLogo');

                this.attr({href: company.homepage ? company.homepage + '' : null});

                this.appendChild(this.image = img(
                        {
                                src: company.logoURL,
                                alt: ''
                        }
                ));
        }
        else
        {
                this.assertHasClass('CompanyLogo');
                this.image = this.assertSelector('> img');
        }
}

module.exports = CompanyLogo;
require('inherits')(CompanyLogo, domv.Component);

