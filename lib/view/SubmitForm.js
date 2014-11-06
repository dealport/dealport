'use strict';
var domv = require('domv');

require('static-reference')('./style/SubmitForm.less');

function SubmitForm(node, csrfToken)
{
        domv.Component.call(this, node, 'form');

        if (this.isCreationConstructor(node))
        {
                var p = this.shorthand('p');
                var t = this.textShorthand();
                var span = this.shorthand('span');
                var label = this.shorthand('label');
                var textarea  = this.shorthand('textarea');
                var hr = this.shorthand('hr');
                var url = this.shorthand('input', {type: 'url'});
                var text  = this.shorthand('input', {type: 'text'});
                var submit = this.shorthand('input', {type: 'submit', value: 'Submit'});

                if (!csrfToken ||
                    typeof csrfToken !== 'string')
                {
                        throw domv.Exception(Error('Missing/invalid argument csrfToken'));
                }

                this.cls('SubmitForm');

                this.attr({
                        method: 'POST'
                });

                this.appendChild(
                        this.create('input', {
                                type: 'hidden',
                                name: 'csrf',
                                value: csrfToken
                        }),
                        p('intro', 'Do you know of a startup that is missing? Fill out this form to add it to our index!'),
                        label('companyName required'  , span(t('Company Name'       )), text({name: 'companyName'  })),
                        label('homepage required'     , span(t('Company Homepage'   )), url ({name: 'homepage'     })),
                        label('other multiline'       , span(t('Other information you would like to share')), textarea({name: 'other'})),
                        hr(),
                        label('submitterName required', span(t('Your name'          )), text({name: 'submitterName'})),
                        label('submitterMail required', span(t('Your e-mail address')), text({name: 'submitterMail'})),
                        p('submit', submit())
                );
        }
        else
        {
                this.assertHasClass('SubmitForm');
        }
}

module.exports = SubmitForm;
require('inherits')(SubmitForm, domv.Component);

