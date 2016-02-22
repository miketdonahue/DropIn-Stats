// Events Table Dump
// UAT

var Parse = require('parse').Parse;
var json2csv = require('json2csv');
var fs = require('fs');
var _ = require('underscore');
var moment = require('moment');

// Parse Keys
Parse.initialize(process.env.UAT_PARSE_ID, process.env.UAT_PARSE_SECRET);

var Events = Parse.Object.extend('Events');

// Data Dump
var total;
var iterations;
var firstRun = true;
var objectId = null;
var tableData = [];
var filename = 'uat-events-table.csv';
var fields = [
  'objectId',
  'name',
  'barId',
  'loyaltyLevelId',
  'eventStart',
  'eventEnd',
  'markedForDeletion',
  'createdAt',
  'updatedAt'
];

var eventsQuery = new Parse.Query(Events);
eventsQuery.count().then(function(totalRows) {
  total = totalRows;
  iterations = Math.ceil(total / 1000);
})
.then(function() {
  var eventsQuery = new Parse.Query(Events);

  var promise = Parse.Promise.as();
  _.times(iterations, function() {
    promise = promise.then(function() {
      var count = 0;

      eventsQuery.include('barId.userId');
      eventsQuery.descending('objectId');
      eventsQuery.limit(1000);
      if (!firstRun) eventsQuery.lessThan('objectId', objectId);
      return eventsQuery.find().then(function(results) {
        _.each(results, function(obj) {
          count = count + 1;

          if (count === 1000) {
            objectId = obj.id;
          }

          var formattedObj = {
            objectId: obj.id,
            name: obj.attributes.name,
            barId: obj.attributes.barId.id,
            loyaltyLevelId: obj.attributes.loyaltyLevelId.id,
            eventStart: obj.attributes.eventStart.toISOString(),
            eventEnd: obj.attributes.eventEnd.toISOString(),
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
    fs.writeFile('../../csv/' + filename, csv, function(err) {
      if (err) throw err;
      console.log('file saved');
    });
  });
});