// #####################
// ##-  Reward Statistics  -##
// #####################
'use strict';

// Required tables: Bar, Users_Rewards, Stats_Rewards

// Requires
var Parse = require('parse').Parse;
var _ = require('underscore');
var moment = require('moment');

// Parse Keys
Parse.initialize(process.env.PARSE_ID, process.env.PARSE_SECRET);

// Create new objects
var Bar = Parse.Object.extend('Bar');
var UsersRewards = Parse.Object.extend('Users_Rewards');
var StatsRewards = Parse.Object.extend('Stats_Rewards');

// Instantiate queries
var barQuery = new Parse.Query(Bar);
var usersRewardsQuery = new Parse.Query(UsersRewards);

// Main iteration
barQuery
.each(function(bar) {
  calcStats(bar);
});

// Main function
function calcStats(bar) {
  // Initialize master object to carry state of calculations through promises
  var data = {};

  // Stat Calculations
  var rewardsRedeemed = 0;

  usersRewardsQuery.equalTo('barId', bar);
  usersRewardsQuery.include('userId');
  usersRewardsQuery.limit(1000);
  usersRewardsQuery.find().then(function(results) {
    var startDay = moment().subtract(1, 'days').hours(9).minute(0).second(0).millisecond(0); // 9am yesterday UTC (4am EST)
    var endDay = moment().hours(9).minute(0).second(0).millisecond(0); // 9am today UTC (4am EST)

    // Number of redeemed rewards per bar
    _.each(results, function(obj) {
      var userHasRedeemed = obj.attributes.userHasRedeemed;
      var redeemedOnDate = moment(obj.attributes.redeemedOnDate);

      // If the user redeemed a reward at this bar, increment the count
      if (userHasRedeemed && redeemedOnDate.isBetween(startDay, endDay)) {
        rewardsRedeemed++;
      }
    });

    var stats = {
      calcDate: new Date(), // Point in time date tracking
      barId: bar,
      rewardsRedeemed: rewardsRedeemed
    };

    data.stats = stats;
  })
  .then(function() {
    var newStat = new StatsRewards();

    newStat.save(data.stats).then(function(savedObj) {
      // success
      console.log('Parse record with object ID: ' + savedObj.id + ' has been successfully created.');
    }, function(error) {
      // error
      console.log('An error has occured: ' + error);
    });
  });
}
