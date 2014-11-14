'use strict';
var domv = require('domv');

//require('static-reference')('./style/CompanyShortMetaTable.less');
var EditablePlainText = require('./editing/EditablePlainText');
var EditableBooleanText = require('./editing/EditableBooleanText');

function CompanyShortMetaTable(node, router, company)
{
        domv.Component.call(this, node, 'table');

        if (this.isCreationConstructor(node))
        {
                this.cls('CompanyShortMetaTable');

                var colgroup = this.shorthand('colgroup');
                var col = this.shorthand('col');

                this.attr('data-id', company._id);

                this.appendChild(colgroup(
                        col('title'),
                        col('value')
                ));

                this.appendChild(this.tbody = this.create('tbody'));
                this.innerNode = this.tbody;


                this.addRow('revenueModel',
                        'Makes money via',
                        this.revenueModel = new EditablePlainText(this.document, 'div', false, company.revenueModel || 'Unknown')
                );

                this.addRow('hiring',
                        'Hiring',
                        this.hiring = new EditableBooleanText(this.document, company.hiring)
                );

                this.addRow('openForInvestment',
                        'Open for investment',
                        this.openForInvestment = new EditableBooleanText(this.document, company.openForInvestment)
                );
        }
        else
        {
                this.assertHasClass('CompanyShortMetaTable');
                this.tbody = this.revenueModel = this.assertSelector('> tbody');
                this.revenueModel = this.tbody.assertSelector('> .revenueModel > .value > .EditablePlainText', EditablePlainText);
                this.hiring = this.tbody.assertSelector('> .hiring > .value > .EditableBooleanText', EditableBooleanText);
                this.openForInvestment = this.tbody.assertSelector('> .openForInvestment > .value > .EditableBooleanText', EditableBooleanText);
        }
}

module.exports = CompanyShortMetaTable;
require('inherits')(CompanyShortMetaTable, domv.Component);

CompanyShortMetaTable.prototype.addRow = function(className, title, value)
{
        var tr = this.shorthand('tr');
        var td = this.shorthand('td');
        var row;

        this.appendChild(row = tr(className,
                td('title', title),
                td('value', value)
        ));
        return row;
};

Object.defineProperty(CompanyShortMetaTable.prototype, 'id', {
        get: function()
        {
                return this.getAttr('data-id');
        }
});

Object.defineProperty(CompanyShortMetaTable.prototype, 'editing', {
        configurable: true,
        get: function()
        {
                return this.hasClass('editing');
        },
        set: function(value)
        {
                value = !!value;
                this.toggleClass('editing', value);
                this.revenueModel.editing = value;
                this.hiring.editing = value;
                this.openForInvestment.editing = value;
        }
});