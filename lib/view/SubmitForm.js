'use strict';
var domv = require('domv');

require('static-reference')('./style/SubmitForm.less');

function SubmitForm(node, csrfToken)
{
        domv.Component.call(this, node, 'form');

        this.fields = {};
        this.fieldNames = [
                'companyName',
                'homepage',
                'other',
                'submitterName',
                'submitterMail'
        ];

        if (this.isCreationConstructor(node))
        {
                var p = this.shorthand('p');
                var t = this.textShorthand();
                var span = this.shorthand('span');
                var label = this.shorthand('label');
                var textarea  = this.shorthand('textarea');
                var hr = this.shorthand('hr');
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
                        label('companyName required',
                                span(t('Company Name')),
                                this.fields.companyName = text({name: 'companyName'})
                        ),
                        label('homepage required',
                                span(t('Company Homepage')),
                                this.fields.homepage = text({name: 'homepage'})
                        ),
                        label('other multiline',
                                span(t('Other information you would like to share')),
                                this.fields.other = textarea({name: 'other'})
                        ),
                        hr(),
                        label('submitterName required',
                                span(t('Your name')),
                                this.fields.submitterName = text({name: 'submitterName'})
                        ),
                        label('submitterMail required',
                                span(t('Your e-mail address')),
                                this.fields.submitterMail = text({name: 'submitterMail'})
                        ),
                        this.errorMessage = p('errorMessage'),
                        p('submit', submit())
                );
        }
        else
        {
                this.assertHasClass('SubmitForm');

                this.fieldNames.forEach(function(name)
                {
                        this.fields[name] = this.assertSelector('[name='+name+']');
                }, this);

                this.errorMessage = this.assertSelector('> .errorMessage');
        }

        this.on('submit', this._onSubmit.bind(this));
}

module.exports = SubmitForm;
require('inherits')(SubmitForm, domv.Component);

SubmitForm.prototype._onSubmit = function(e)
{
        if (!this.validate(true))
        {
                e.preventDefault();
        }
};

SubmitForm.prototype.validate = function(showErrorMessage)
{
        var valid = true;

        var errorMessage = function(message)
        {
                this.errorMessage.textContent = message;
                errorMessage = function() { /* noop */ };
        }.bind(this);

        this.errorMessage.textContent = '';

        // (this would need some tweaks for radio, checkbox & option)

        this.fieldNames.forEach(function(name)
        {
                var fieldValid = this.validateField(
                        name,
                        this.fields[name].value,
                        errorMessage
                );

                this.fields[name].toggleClass('error', !fieldValid);

                if (!fieldValid)
                {
                        valid = false;
                }
        }, this);

        return valid;
};

SubmitForm.prototype.validateField = function(field, value, errorMessage)
{
        switch (field)
        {
                case 'companyName':
                        if (!value)
                        {
                                errorMessage('Please fill out the company name');
                                return false;
                        }
                        return true;
                case 'homepage':
                        if (!value)
                        {
                                errorMessage('Please fill out the company homepage');
                                return false;
                        }
                        return true;
                case 'other':
                        if (value.length > 10000)
                        {
                                errorMessage('Other information is way too long');
                        }
                        return true;
                case 'submitterName':
                        if (!value)
                        {
                                errorMessage('Please fill out your name');
                                return false;
                        }
                        return true;
                case 'submitterMail':
                        if (!value)
                        {
                                errorMessage('Please fill out your e-mail');
                                return false;
                        }

                        if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,10}$/i.test(value))
                        {
                                errorMessage('Your e-mail address does not appear to be valid');
                                return false;
                        }
                        return true;
        }

        return true;
};