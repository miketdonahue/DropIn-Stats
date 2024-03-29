// Users Table Dump

var Parse = require('parse/node');
var json2csv = require('json2csv');
var fs = require('fs');
var _ = require('underscore');
var moment = require('moment');
var env = require('../environments');

// Parse Keys
Parse.initialize(env.PARSE_ID);
Parse.serverURL = env.SERVER_URL;

var User = Parse.Object.extend('User');

// Data Dump
var total;
var iterations;
var firstRun = true;
var objectId = null;
var tableData = [];
var filename;
var fields = [
  'objectId',
  'username',
  'dob',
  'gender',
  'loyaltyLevelId',
  'roleId',
  'barId',
  'activeRewards',
  'globalCredits',
  'viewedInstructions',
  'completedSignup',
  'excludeUser',
  'shareCode',
  'ageBucket',
  'createdAt',
  'updatedAt'
];

// Filename
if (env.ENV === 'production') {
  filename = 'user-table.csv';
} else {
  filename = 'uat-user-table.csv';
}

// Query
var userQuery = new Parse.Query(User);
userQuery.count().then(function(totalRows) {
  total = totalRows;
  iterations = Math.ceil(total / 1000);
})
.then(function() {
  var userQuery = new Parse.Query(User);

  var promise = Parse.Promise.as();
  _.times(iterations, function() {
    promise = promise.then(function() {
      var count = 0;

      userQuery.include('loyaltyLevelId.roleId');
      userQuery.descending('objectId');
      userQuery.limit(1000);
      if (!firstRun) userQuery.lessThan('objectId', objectId);
      return userQuery.find().then(function(results) {
        _.each(results, function(obj) {
          count = count + 1;

          if (count === 1000) {
            objectId = obj.id;
          }

          var formattedObj = {
            objectId: obj.id,
            username: obj.attributes.username ? obj.attributes.username : null,
            dob: obj.attributes.dob ? obj.attributes.dob.toISOString() : null,
            gender: obj.attributes.gender ? obj.attributes.gender : null,
            loyaltyLevelId: obj.attributes.loyaltyLevelId? obj.attributes.loyaltyLevelId.id : null,
            roleId: obj.attributes.roleId ? obj.attributes.roleId.id : null,
            barId: obj.attributes.barId ? obj.attributes.barId.id : null,
            activeRewards: obj.attributes.activeRewards ? obj.attributes.activeRewards : null,
            globalCredits: obj.attributes.globalCredits ? obj.attributes.globalCredits : null,
            viewedInstructions: obj.attributes.viewedInstructions ? obj.attributes.viewedInstructions : null,
            completedSignup: obj.attributes.completedSignup ? obj.attributes.completedSignup : null,
            excludeUser: obj.attributes.excludeUser ? obj.attributes.excludeUser : null,
            shareCode: obj.attributes.shareCode ? obj.attributes.shareCode : null,
            ageBucket: obj.attributes.ageBucket ? obj.attributes.ageBucket : null,
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
    fs.writeFile('../csv/' + filename, csv, function(err) {
      if (err) throw err;
      console.log('file saved');
    });
  });
});
