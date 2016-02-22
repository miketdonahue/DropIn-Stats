// Users Rewards Table Dump
// UAT

var Parse = require('parse').Parse;
var json2csv = require('json2csv');
var fs = require('fs');
var _ = require('underscore');
var moment = require('moment');

// Parse Keys
Parse.initialize(process.env.UAT_PARSE_ID, process.env.UAT_PARSE_SECRET);

var UsersRewards = Parse.Object.extend('Users_Rewards');

// Data Dump
var total;
var iterations;
var firstRun = true;
var objectId = null;
var tableData = [];
var filename = 'uat-users-rewards-table.csv';
var fields = [
  'objectId',
  'userId',
  'barId',
  'userHasRedeemed',
  'redeemedOnDate',
  'acquiredDate',
  'rewardType',
  'createdAt',
  'updatedAt'
];

var usersRewardsQuery = new Parse.Query(UsersRewards);
usersRewardsQuery.count().then(function(totalRows) {
  total = totalRows;
  iterations = Math.ceil(total / 1000);
})
.then(function() {
  var usersRewardsQuery = new Parse.Query(UsersRewards);

  var promise = Parse.Promise.as();
  _.times(iterations, function() {
    promise = promise.then(function() {
      var count = 0;

      usersRewardsQuery.include('barId.userId');
      usersRewardsQuery.descending('objectId');
      usersRewardsQuery.limit(1000);
      if (!firstRun) usersRewardsQuery.lessThan('objectId', objectId);
      return usersRewardsQuery.find().then(function(results) {
        _.each(results, function(obj) {
          count = count + 1;

          if (count === 1000) {
            objectId = obj.id;
          }

          var formattedObj = {
            objectId: obj.id,
            userId: obj.attributes.userId.id,
            barId: obj.attributes.barId ? obj.attributes.barId.id : null,
            userHasRedeemed: obj.attributes.userHasRedeemed,
            redeemedOnDate: obj.attributes.redeemedOnDate ? obj.attributes.redeemedOnDate.toISOString() : null,
            acquiredDate: obj.attributes.acquiredDate ? obj.attributes.acquiredDate.toISOString() : null,
            rewardType: obj.attributes.rewardType,
            createdAt: obj.createdAt.toISOString(),
            updatedAt: obj.updatedAt.toISOString()
          };

          tableData.push(formattedObj);
        });
      })
      .then(function() {
        firstRun = false;
      });
    });
  });

  return promise;
})
.then(function() {
  json2csv({ data: tableData, fields: fields }, function(err, csv) {
    if (err) console.log(err);
    fs.writeFile('../../csv/' + filename, csv, function(err) {
      if (err) throw err;
      console.log('file saved');
    });
  });
});