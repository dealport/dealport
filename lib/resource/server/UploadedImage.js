'use strict';
var P = require('bluebird');

var Resource = require('../Resource');
var Company = require('./Company');
var GridStore = P.promisifyAll(require('mongodb').GridStore);
var ObjectID = require('mongodb').ObjectID;

function UploadedImage(primus, model, config, user)
{
        Resource.call(this, primus, 'UploadedImage', 1);
        this.model = model;
        this.user = user;

        this.listen(['clearCompanyLogo', 'updateCompanyLogoStart', 'updateCompanyLogoEnd']);
}

require('inherits')(UploadedImage, Resource);
module.exports = UploadedImage;

UploadedImage.maxByteSize = 1024 * 1024;

function noop(){}

UploadedImage.prototype.clearCompanyLogo = function(companyId)
{
        // todo
};

function resetChannelData(channelData)
{
        channelData.mongoClient = null;
        channelData.companyId = null;
        channelData.valid = false;
        channelData.error = null;
        channelData.fileSizeSoFar = 0;
        channelData.gridStore = null;
        channelData.onData = null;
        channelData.cleanupAfterError = noop;
}

UploadedImage.prototype.updateCompanyLogoStart = function(companyIdArg, mimeType)
{
        var channelData = this.currentChannelData;
        var user = this.user;
        var model = this.model;

        resetChannelData(channelData);

        if (!user ||
            !user._id)
        {
                return P.reject(Error('You must be logged in'));
        }

        if (mimeType !== 'image/png' &&
            mimeType !== 'image/jpeg')
        {
                return P.reject(Error('Invalid mime type'));
        }

        return model.acquireExplicit().then(function(client)
        {
                return P.method(function()
                {
                        channelData.mongoClient = client;
                        var companyCollection = P.promisifyAll(client.collection('company'));
                        channelData.companyId = new ObjectID(companyIdArg);

                        return companyCollection.findOneAsync({_id: channelData.companyId})
                        .bind(this)
                        .then(function(company)
                        {
                                if (!company)
                                {
                                        throw Error('Invalid company id');
                                }

                                if (!Company.isCompanyEditableByUser(company, user))
                                {
                                        throw Error('You are not allowed to edit this company');
                                }
                        })
                        .then(function()
                        {
                                channelData.fileId = new ObjectID();

                                var gridStore = P.promisifyAll(new GridStore(
                                        client,
                                        channelData.fileId,
                                        'w',
                                        {
                                                root: 'uploadedImage',
                                                'content_type': mimeType,
                                                createdByUser: user._id,
                                                uploadedForCompany: channelData.companyId
                                        }
                                ));

                                channelData.cleanupAfterError = function()
                                {
                                        channelData.gridStore.close(function(err)
                                        {
                                                if (err)
                                                {
                                                        console.error('Error in clean up', Error().stack, ' caused by ', err, err.stack);
                                                }
                                        });

                                        GridStore.unlink(channelData.mongoClient, 'uploadedImage', function(err)
                                        {
                                                if (err)
                                                {
                                                        console.error('Error in clean up', Error().stack, ' caused by ', err, err.stack);
                                                }
                                        });

                                        model.release(channelData.mongoClient);
                                        channelData.mongoClient = null; // prevent duplicate releases

                                        channelData.cleanupAfterError = noop;
                                };

                                return gridStore.openAsync();
                        })
                        .then(function(gridStore)
                        {
                                gridStore = P.promisifyAll(gridStore);
                                channelData.gridStore = gridStore;
                                channelData.valid = true;

                                channelData.onData = function(data)
                                {
                                        if (!(data instanceof Uint8Array))
                                        {
                                                return; // primus-emitter event
                                        }

                                        if (!channelData.valid)
                                        {
                                                // todo notify the client immediately of the error
                                                return;
                                        }

                                        channelData.fileSizeSoFar += data.length;

                                        if (channelData.fileSizeSoFar > UploadedImage.maxByteSize)
                                        {
                                                channelData.valid = false;
                                                channelData.error = Error('The image file must be smaller than ' + UploadedImage.maxByteSize + ' bytes');
                                                channelData.cleanupAfterError();
                                                return;
                                        }

                                        channelData.gridStore.writeAsync(new Buffer(data)).catch(function(err)
                                        {
                                                channelData.valid = false;
                                                channelData.error = err;
                                                channelData.cleanupAfterError();
                                        });
                                }.bind(this);

                                channelData.channelSpark.on('data', channelData.onData);
                        });
                }.bind(this))()
                .finally(function()
                {
                        if (!channelData.valid)
                        {
                                model.release(channelData.mongoClient);
                                channelData.mongoClient = null; // prevent duplicate releases
                        }
                });
        }.bind(this));
};

UploadedImage.prototype.updateCompanyLogoEnd = function(success)
{
        var model = this.model;
        var channelData = this.currentChannelData;

        if (channelData.onData)
        {
                channelData.channelSpark.removeListener('data', channelData.onData);
        }

        return P.resolve().then(function()
        {
                if (channelData.error)
                {
                        return P.reject(channelData.error);
                }
                else if (!channelData.valid)
                {
                        return P.reject(Error('Incorrect ordering of operations'));
                }

                return channelData.gridStore.closeAsync();
        })
        .then(function()
        {
                var companyCollection = P.promisifyAll(channelData.mongoClient.collection('company'));
                return companyCollection.updateAsync(
                        {_id: channelData.companyId},
                        {$set: {logoUploadedImage: channelData.fileId}},
                        {w : 1}
                );
        })
        .then(function()
        {
                console.log('Completed file upload',
                        channelData.fileSizeSoFar,
                        channelData.fileId,
                        channelData.companyId
                );

                return '/company-logo/' + channelData.companyId;
        })
        .catch(function(err)
        {
                channelData.cleanupAfterError();
                return P.reject(err);
        })
        .finally(function()
        {
                model.release(channelData.mongoClient);
                channelData.mongoClient = null; // prevent duplicate releases
                resetChannelData(channelData);
        });
};

UploadedImage.prototype.companyLogoAsResponse = function(companyId, res)
{
        var model = this.model;

        function do404()
        {
                res.statusCode = 404;
                res.setHeader('Content-Type' ,'text/plain; charset=UTF-8');
                res.end('404');
        }

        try
        {
                companyId = new ObjectID(companyId);
        }
        catch(err)
        {
                do404();
                return P.resolve(false);
        }

        return P.using(model.acquire(), function(client)
        {
                var companyCollection = P.promisifyAll(client.collection('company'));

                return companyCollection.findOneAsync({_id: companyId})
                .bind(this)
                .then(function(company)
                {
                        return company && company.logoUploadedImage;
                })
                .then(function(uploadedImageID)
                {
                        if (!uploadedImageID)
                        {
                                do404();
                                return P.resolve(false);
                        }

                        var gridStore = P.promisifyAll(new GridStore(
                                client,
                                uploadedImageID,
                                'r',
                                {root: 'uploadedImage'}
                        ));

                        return gridStore.openAsync()
                        .then(function(gridStore)
                        {
                                gridStore = P.promisifyAll(gridStore);

                                res.setHeader('Content-Length', gridStore.length);
                                if (gridStore.contentType)
                                {
                                        res.setHeader('Content-Type', gridStore.contentType);
                                }

                                var stream = gridStore.stream(true); // auto close

                                return new P(function(resolve, reject)
                                {
                                        res.on('finish', resolve);
                                        stream.on('error', reject);
                                        stream.pipe(res);
                                });
                        });
                });
        });
};
