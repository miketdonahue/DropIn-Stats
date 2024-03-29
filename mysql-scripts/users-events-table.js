// Users Events Table Dump

var Parse = require('parse/node');
var json2csv = require('json2csv');
var fs = require('fs');
var _ = require('underscore');
var moment = require('moment');
var env = require('../environments');

// Parse Keys
Parse.initialize(env.PARSE_ID);
Parse.serverURL = env.SERVER_URL;

var UsersEvents = Parse.Object.extend('Users_Events');

// Data Dump
var total;
var iterations;
var firstRun = true;
var objectId = null;
var tableData = [];
var filename;
var fields = [
  'objectId',
  'eventId',
  'userId',
  'barId',
  'eventStart',
  'eventEnd',
  'userHasViewed',
  'markedForDeletion',
  'createdAt',
  'updatedAt'
];

// Filename
if (env.ENV === 'production') {
  filename = 'users-events-table.csv';
} else {
  filename = 'uat-users-events-table.csv';
}

// Query
var usersEventsQuery = new Parse.Query(UsersEvents);
usersEventsQuery.count().then(function(totalRows) {
  total = totalRows;
  iterations = Math.ceil(total / 1000);
})
.then(function() {
  var usersEventsQuery = new Parse.Query(UsersEvents);

  var promise = Parse.Promise.as();
  _.times(iterations, function() {
    promise = promise.then(function() {
      var count = 0;

      usersEventsQuery.include('barId.eventId.userId');
      usersEventsQuery.descending('objectId');
      usersEventsQuery.limit(1000);
      if (!firstRun) usersEventsQuery.lessThan('objectId', objectId);
      return usersEventsQuery.find().then(function(results) {
        _.each(results, function(obj) {
          count = count + 1;

          if (count === 1000) {
            objectId = obj.id;
          }

          var formattedObj = {
            objectId: obj.id,
            eventId: obj.attributes.eventId ? obj.attributes.eventId.id : null,
            userId: obj.attributes.userId ? obj.attributes.userId.id : null,
            barId: obj.attributes.barId ? obj.attributes.barId.id : null,
            eventStart: obj.attributes.eventStart ? obj.attributes.eventStart.toISOString() : null,
            eventEnd: obj.attributes.eventEnd ? obj.attributes.eventEnd.toISOString() : null,
            userHasViewed: obj.attributes.userHasViewed,
            markedForDeletion: obj.attributes.markedForDeletion,
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
