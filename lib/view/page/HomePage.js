'use strict';
var domv = require('domv');
var StateAnchor = require('../StateAnchor');
var CompanyGrid = require('../CompanyGrid');

require('static-reference')('./style/HomePage.less');

function HomePage(node, router)
{
        domv.Component.call(this, node);


        if (this.isCreationConstructor(node))
        {
                this.cls('HomePage');
                this.title = 'Welcome';
                this.textStateAnchors = [];

                var div = this.shorthand('div');
                var p = this.shorthand('p');
                var a = this.shorthand('a');

                this.appendChild(
                        div('intro',
                                //https://twitter.com/richardvdhorst
                                p('', '01-11-2014, Rotterdam'),
                                p('',
                                        'My name is ',
                                        a({href: 'https://twitter.com/richardvdhorst'}, 'Richard'),
                                        ' and I believe Rotterdam is a happy place for entrepreneurs like me. ',
                                        'To make our ecosystem more visible I\'m mapping the Rotterdam startup community. ',
                                        'This is just the beginning. ',
                                        'Wanna help? ',
                                        this.textStateAnchors[this.textStateAnchors.length-1] =
                                                new StateAnchor(this.document, router, ['page', 'home', 'submit'], '[Add Startup]')
                                ),
                                p('',
                                        'All the best, ',
                                        a({href: 'https://twitter.com/richardvdhorst'}, 'Richard')
                                )
                        ),
                        this.companyGrid = new CompanyGrid(this.document, router)
                );
        }
        else
        {
                this.assertHasClass('HomePage');
                this.companyGrid = this.assertSelector('> .CompanyGrid', CompanyGrid, router);
                this.textStateAnchors = this.selectorAll('> .intro .StateAnchor', StateAnchor, router);
        }
}

module.exports = HomePage;
require('inherits')(HomePage, domv.Component);
