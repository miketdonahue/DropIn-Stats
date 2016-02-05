require 'active_record'
require 'parse-ruby-client'
require 'active_support/core_ext/date_time/calculations'
require 'active_support/core_ext/date/calculations'
require 'active_support/core_ext/time/calculations'
require 'mysql2'

ActiveRecord::Base.establish_connection(
  adapter: 'mysql2',
  host: ENV["DB_HOST"],
  database: 'dropin',
  username: ENV["DB_USERNAME"],
  password: ENV["DB_PASSWORD"]
)

parse = Parse.init application_id: ENV["PARSE_ID"], api_key: ENV["PARSE_REST_API"]

class Event < ActiveRecord::Base
end

class Timeline < ActiveRecord::Base
end

class EventsUsers < ActiveRecord::Base
end

def bar_pointer(bar_id)
  bar_query = Parse::Query.new("Bar")
  bar_query.eq("objectId", "#{bar_id}")
  bar = bar_query.get.first
end

def event_pointer(event_id)
  event_query = Parse::Query.new("Events")
  event_query.eq("objectId", "#{event_id}")
  event = event_query.get.first
end

def save_stats(
  event_id,
  bar_id,
  users_sent_to,
  credits_earned
)
  event_stats = Parse::Object.new("Stats_Events")
  event = event_pointer(event_id)
  bar = bar_pointer(bar_id)

  event_stats["calcDate"] = Parse::Date.new(DateTime.now)
  event_stats["eventId"] = event
  event_stats["barId"] = bar
  event_stats["usersSentTo"] = users_sent_to
  event_stats["creditsEarned"] = credits_earned

  event_stats.save

  puts "Event stats record successfully created for bar #{bar_id}"
end

def calc_stats(
  event_id,
  event_name,
  bar_id,
  event_end
)
  start_calc_datetime = 1.day.ago.change({ hour: 9, min: 0, sec: 0, usec: 0 }).iso8601
  end_calc_datetime = Time.now.change({ hour: 9, min: 0, sec: 0, usec: 0 }).iso8601
  event_date_in_range = (start_calc_datetime..end_calc_datetime).cover?(event_end)

  if event_date_in_range
    puts "Running event stats for #{event_name}"

    users_sent_to = Event.find_by_sql("
      SELECT DISTINCT eu.user_id FROM events e
      JOIN events_users eu ON eu.event_id = e.object_id
      WHERE e.object_id = '#{event_id}' AND
      e.event_end BETWEEN '#{start_calc_datetime}' AND '#{end_calc_datetime}'
    ").count

    credits_earned = Event.find_by_sql("
      SELECT DISTINCT t.user_id FROM timelines t
      JOIN events_users eu ON eu.user_id = t.user_id
      WHERE event_type = 'Credit Earned' AND
      t.bar_id = '#{bar_id}' AND
      t.date BETWEEN '#{start_calc_datetime}' AND '#{end_calc_datetime}'
    ").count

    save_stats(
      event_id,
      bar_id,
      users_sent_to,
      credits_earned
    )
  end
end

Event.find_each do |event|
  calc_stats(event.object_id, event.name, event.bar_id, event.event_end)
end
