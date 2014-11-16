'use strict';
var domv = require('domv');
var lazyTimer = require('lazy-timer');
var StateAnchor = require('./StateAnchor');

require('static-reference')('./style/SubmitForm.less');

function SubmitForm(node, router, csrfToken, showSubmitterFields)
{
        domv.Component.call(this, node, 'form');

        this.router = router;

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
                        )
                );

                if (showSubmitterFields)
                {
                        this.cls('showSubmitterFields');
                        this.appendChild(
                                hr(),
                                label('submitterName required',
                                        span(t('Your name')),
                                        this.fields.submitterName = text({name: 'submitterName'})
                                ),
                                label('submitterMail required',
                                        span(t('Your e-mail address')),
                                        this.fields.submitterMail = text({name: 'submitterMail'})
                                )
                        );
                }

                this.appendChild(
                        this.errorMessage = p('errorMessage'),
                        this.exceptionMessage = p('exceptionMessage'),
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
                this.exceptionMessage = this.assertSelector('> .exceptionMessage');
                this.thanksAnchor = this.selector('> .thanks > .StateAnchor', StateAnchor, this.router);
        }

        this.lazyValidate = lazyTimer(100, false, this, [false], this.validate);
        this.on('submit', this._onSubmit);
        this.on('change', this.lazyValidate, true);
        this.on('keypress', this.lazyValidate);
}

module.exports = SubmitForm;
require('inherits')(SubmitForm, domv.Component);

SubmitForm.prototype._onSubmit = function(e)
{
        this.cls('attemptedSubmit');
        if (!this.validate(true))
        {
                e.preventDefault();
        }
};

SubmitForm.prototype.validate = function(showErrorMessage)
{
        var valid = true;
        var noop = function() { /* noop */ };

        var errorMessage = showErrorMessage
                ? function(message)
                {
                        this.errorMessage.textContent = message;
                        errorMessage = noop;
                }.bind(this)
                : noop;

        if (showErrorMessage)
        {
                this.errorMessage.textContent = '';
        }

        // (this would need some tweaks for radio, checkbox & option)

        this.fieldNames.forEach(function(name)
        {
                var fieldNode = this.fields[name];
                if (!fieldNode)
                {
                        return;
                }

                var fieldValid = this.validateField(
                        name,
                        fieldNode.value,
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

SubmitForm.prototype.getAll = function()
{
        var values = {};

        this.fieldNames.forEach(function(name)
        {
                var fieldNode = this.fields[name];
                if (fieldNode)
                {
                        values[name] = fieldNode.value;
                }
        }, this);

        return values;
};

SubmitForm.prototype.setAll = function(values)
{
        this.fieldNames.forEach(function(name)
        {
                var value = values[name];
                var fieldNode = this.fields[name];

                if (fieldNode &&
                    value !== undefined)
                {
                        fieldNode.attr('value', value);
                        fieldNode.value = value;
                }

        }, this);
};

SubmitForm.prototype.showThanks = function(goBackState)
{
        this.cls('thanks');
        var div = this.shorthand('div');
        var p = this.shorthand('p');

        this.appendChild(div('thanks',
                p('', 'Thank you for your submission!'),
                this.thanksAnchor = new StateAnchor(this.document, this.router, goBackState, '[close]')

        ));
};

SubmitForm.prototype.setBusy = function()
{
        this.selectorAll('input, textarea').forEach(function(node)
        {
                node.attr('disabled', true);
        }, this);
};