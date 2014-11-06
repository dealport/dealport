'use strict';
var domv = require('domv');

var StateAnchor = require('./StateAnchor');

require('static-reference')('./style/CompanyGridItemPlaceholder.less');

function CompanyGridItemPlaceholder(node, router)
{
        domv.Component.call(this, node, 'li');

        if (this.isCreationConstructor(node))
        {
                var p = this.shorthand('p');

                this.cls('CompanyGridItemPlaceholder');

                this.appendChild(this.anchor = new StateAnchor(this.document, router, ['page', 'home', 'submit'],
                        p('text', 'Submit a new company')
                ));
        }
        else
        {
                this.assertHasClass('CompanyGridItemPlaceholder');
                this.anchor = this.assertSelector('> .StateAnchor', StateAnchor, router);
        }
}

module.exports = CompanyGridItemPlaceholder;
require('inherits')(CompanyGridItemPlaceholder, domv.Component);
