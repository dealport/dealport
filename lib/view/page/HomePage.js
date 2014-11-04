'use strict';
var domv = require('domv');
//var StateAnchor = require('../StateAnchor');
var CompanyGrid = require('../CompanyGrid');

require('static-reference')('./style/HomePage.less');

function HomePage(node, router)
{
        domv.Component.call(this, node);

        if (this.isCreationConstructor(node))
        {
                this.cls('HomePage');
                this.title = 'Home';

                var h2 = this.shorthand('h2');

                this.appendChild(
                        h2('title', 'Here are some nice startups'),
                        this.companyGrid = new CompanyGrid(this.document, router)
                );
        }
        else
        {
                this.assertHasClass('HomePage');
                this.companyGrid = this.assertSelector('> .CompanyGrid', CompanyGrid, router);
        }
}

module.exports = HomePage;
require('inherits')(HomePage, domv.Component);
