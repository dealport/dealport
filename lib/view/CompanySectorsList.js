'use strict';
var domv = require('domv');

//require('static-reference')('./style/CompanySectorsList.less');

function CompanySectorsList(node, router, sectors)
{
        domv.Component.call(this, node, 'ul');

        if (this.isCreationConstructor(node))
        {
                this.cls('CompanySectorsList');

                this.addSector(sectors || []);
        }
        else
        {
                this.assertHasClass('CompanySectorsList');
        }
}

module.exports = CompanySectorsList;
require('inherits')(CompanySectorsList, domv.Component);

CompanySectorsList.prototype.addSector = function(sector)
{
        var sectorNode;
        var li = this.shorthand('li');

        if (Array.isArray(sector))
        {
                sector.forEach(this.addSector, this);
                return;
        }

        this.appendChild(sectorNode = li('sector', sector + ''));
        return sectorNode;
};