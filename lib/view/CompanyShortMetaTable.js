'use strict';
var domv = require('domv');

//require('static-reference')('./style/CompanyShortMetaTable.less');

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

                this.addRow('revenueModel', 'Makes money via', company.local.revenueModel || 'Unknown');
                if (company.jobPostingCount)
                {
                        this.addRow('jobVacancies', 'Job vacancies', company.jobPostingCount + '');
                }
                else
                {
                        this.addRow('hiring', 'Hiring', company.local.hiring ? 'Yes' : 'No')
                                .cls(company.local.hiring ? 'yes' : 'no');
                }
                this.addRow('openForInvestment', 'Open for investment', company.local.openForInvestment ? 'Yes' : 'No')
                        .cls(company.local.openForInvestment ? 'yes' : 'no');
        }
        else
        {
                this.assertHasClass('CompanyShortMetaTable');
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
