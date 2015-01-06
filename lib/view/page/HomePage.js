/*
 * DealPort
 * Copyright (c) 2014  DealPort B.V.
 *
 * This file is part of DealPort
 *
 * DealPort is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, version 3 of the License.
 *
 * DealPort is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with DealPort.  If not, see <http://www.gnu.org/licenses/>.
 *
 * In addition, the following supplemental terms apply, based on section 7 of
 * the GNU Affero General Public License (version 3):
 * a) Preservation of all legal notices and author attributions
 */

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
                                ),
                                a('forkMe', {href: 'https://github.com/dealport/dealport/'}, 'Fork me on GitHub')
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
