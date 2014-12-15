/*
 * DealPort
 * Copyright (c) 2014  DealPort B.V.
 *
 * This file is part of DealPort
 *
 * DealPort is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, version 3 of the License.
 *
 * DealPort is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with DealPort.  If not, see <http://www.gnu.org/licenses/>.
 *
 * In addition, the following supplemental terms apply, based on section 7 of
 * the GNU Affero General Public License (version 3):
 * a) Preservation of all legal notices and author attributions
 */

'use strict';

var passport = require('passport');
var FacebookStrategy = require('passport-facebook').Strategy;
var ObjectID = require('mongodb').ObjectID;

var P = require('bluebird');

function updateExternalProfile(model, providerName, profile)
{
        delete profile._raw;

        return P.using(model.acquire(), function(db)
        {
                var find = {};
                find['auth.'+providerName+'.id'] = profile.id;

                return db.user.findOneAsync(find)
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

                                return db.user.updateAsync(
                                        { _id: user._id },
                                        {$set: $set}
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

                                return db.user.insertAsync(
                                        user
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
                P.using(model.acquire(), function(db)
                {
                        return db.user.findOneAsync({_id: new ObjectID(id)});
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