'use strict';
var P = require('bluebird');
var Resource = require('../Resource');
var SMTPConnection = require('smtp-connection');

function CompanySubmit(primus, model, config, user)
{
        Resource.call(this, primus, 'CompanySubmit');
        this.model = model;
        this.config = config;

        this.listen(['submit']);
}

require('inherits')(CompanySubmit, Resource);
module.exports = CompanySubmit;

CompanySubmit.prototype.submit = function(formData)
{
        var config = this.config;

        console.log('sending an e-mail!', config.smtpHost, config.smtpPort, config.smtpSecure, formData);

        var body = '';
        for (var name in formData)
        {
                if (Object.prototype.hasOwnProperty.call(formData, name))
                {
                        body += name + ' = ' + formData[name] + '\n';
                }
        }

        var smtp = new SMTPConnection({
                host: config.smtpHost,
                port: config.smtpPort,
                secure: config.smtpSecure,
                debug: config.smtpDebug,
                tls: {rejectUnauthorized: config.smtpRejectUnauthorizedCA}
        });

        smtp.on('error', function(err)
        {
                p.cancel(err);
        });

        P.promisifyAll(smtp);

        var p = smtp.connectAsync();

        if (config.smtpUser)
        {
                p = p.then(function()
                {
                        return smtp.loginAsync({
                                user: config.smtpUser,
                                pass: config.smtpPass
                        });
                });
        }

        p = p.then(function()
        {
                return smtp.sendAsync(
                        {
                                from: config.smtpFrom,
                                to: config.smtpTo
                        },
                        'Subject: New dealport.co company form submission!\r\n' +
                        '\r\n' +
                        body
                );

        }).then(function()
        {
                smtp.quit();
        });

        p = p.cancellable();

        return p;
};
