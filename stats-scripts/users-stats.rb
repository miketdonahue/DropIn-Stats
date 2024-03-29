require 'active_record'
require 'parse-ruby-client'
require 'active_support/core_ext/date_time/calculations'
require 'active_support/core_ext/date/calculations'
require 'active_support/core_ext/time/calculations'
require 'mysql2'
require '../environments'

ActiveRecord::Base.establish_connection(
  adapter: 'mysql2',
  host: DB_HOST,
  database: DB,
  username: DB_USERNAME,
  password: DB_PASSWORD
)

parse = Parse.init application_id: PARSE_ID, api_key: PARSE_REST_API

class Bar < ActiveRecord::Base
end

class Timeline < ActiveRecord::Base
end

def bar_pointer(bar_id)
  bar_query = Parse::Query.new("Bar")
  bar_query.eq("objectId", "#{bar_id}")
  bar = bar_query.get.first
end

def save_stats(
  bar_id,
  active_users
)
  user_stats = Parse::Object.new("Stats_Users")
  bar = bar_pointer(bar_id)

  user_stats["calcDate"] = Parse::Date.new(Date.yesterday)
  user_stats["barId"] = bar
  user_stats["activeUsersByCredit"] = active_users

  user_stats.save

  puts "User stats record successfully created for bar #{bar_id}"
end

def calc_stats(bar_id)
  fourteen_days_ago = 14.days.ago.iso8601

  puts fourteen_days_ago

  active_users = Timeline.find_by_sql("
    SELECT DISTINCT user_id FROM timelines
    WHERE bar_id = '#{bar_id}' AND
    (event_type = 'Credit Earned' OR event_type = 'Reward Redeemed') AND
    date >= '#{fourteen_days_ago}'
  ").count

  save_stats(
    bar_id,
    active_users
  )
end

Bar.find_each do |bar|
  puts "Running user stats for #{bar.name}"
  calc_stats(bar.object_id)
end
