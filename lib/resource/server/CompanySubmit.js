'use strict';
var P = require('bluebird');
var Resource = require('../Resource');
var SMTPConnection = require('smtp-connection');

function CompanySubmit(primus, model, config, user)
{
        Resource.call(this, primus, 'CompanySubmit');
        this.model = model;
        this.config = config;
        this.user = user;

        this.listen(['submit']);
}

require('inherits')(CompanySubmit, Resource);
module.exports = CompanySubmit;

CompanySubmit.prototype.submit = function(formData)
{
        var config = this.config;

        console.log('sending an e-mail!', config.smtpHost, config.smtpPort, config.smtpSecure, formData);

        var body = JSON.stringify(formData, null, 4);

        body += '\n\n';
        if (this.user)
        {
                body += 'submitter logged in as:\n' + JSON.stringify(this.user, null, 4) + '\n';
        }
        else
        {
                body += 'submitter is not logged\n';
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
                        'Content-Type: text/plain; charset=UTF-8\r\n' +
                        'Subject: New DealPort.co company form submission!\r\n' +
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
