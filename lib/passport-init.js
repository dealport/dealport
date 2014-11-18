'use strict';

var passport = require('passport');
var FacebookStrategy = require('passport-facebook').Strategy;
var ObjectID = require('mongodb').ObjectID;

var P = require('bluebird');

function updateExternalProfile(model, providerName, profile)
{
        delete profile._raw;

        return P.using(model.acquire(), function(client)
        {
                var userCollection = P.promisifyAll(client.collection('user'));
                var find = {};
                find['auth.'+providerName+'.id'] = profile.id;

                return userCollection.findOneAsync(find)
                .then(function(user)
                {
                        if (user)
                        {
                                var $set = {};
                                if (!user.auth) { user.auth = {}; }

                                user.auth[providerName] = profile;
                                $set['auth.' + providerName] = profile;

                                if (!user.displayName)
                                {
                                        user.displayName = profile.displayName;
                                        $set.displayName = user.displayName;
                                }

                                if (!user.email &&
                                    profile.emails &&
                                    profile.emails.length)
                                {
                                        user.email = profile.emails[0].value;
                                        $set.email = user.email;
                                }

                                return userCollection.updateAsync(
                                        { _id: user._id },
                                        {$set: $set},
                                        {w: 1}
                                ).return(user);
                        }
                        else
                        {
                                user = {
                                        _id: new ObjectID(),
                                        auth: {},
                                        displayName: profile.displayName,
                                        email: profile.emails &&
                                        profile.emails.length &&
                                        profile.emails[0].value
                                };
                                user.auth[providerName] = profile;

                                return userCollection.insertAsync(
                                        user,
                                        {w:1}
                                ).return(user);
                        }
                });
        });
}

module.exports = function(model, config, expressApp)
{
        var passportInitialize = passport.initialize();
        var passportSession = passport.session();
        expressApp.use(passportInitialize);
        expressApp.use(passportSession);

        expressApp.get('/auth/facebook', passport.authenticate('facebook', { scope: ['public_profile', 'email'] }));
        expressApp.get('/auth/facebook/callback',
                passport.authenticate('facebook', { successRedirect: '/', failureRedirect: '/login' })
        );

        passport.serializeUser(function(user, done)
        {
                done(null, user._id);
        });

        passport.deserializeUser(function(id, done)
        {
                P.using(model.acquire(), function(client)
                {
                        var userCollection = P.promisifyAll(client.collection('user'));

                        return userCollection.findOneAsync({_id: new ObjectID(id)});
                }).nodeify(done);
        });

        if (config.facebookAppID)
        {
                passport.use(new FacebookStrategy(
                        {
                                clientID    : config.facebookAppID,
                                clientSecret: config.facebookAppSecret,
                                callbackURL : config.callbackUrlPrefix + '/auth/facebook/callback'
                        },
                        function (accessToken, refreshToken, profile, done)
                        {
                                updateExternalProfile(model, 'facebook', profile).nodeify(done);
                        }
                ));
        }
};