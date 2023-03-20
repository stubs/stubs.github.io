---
layout: post
title: Islands and Gaps
excerpt: A classic SQL exercise in the real world!
---

## Islands?
This past week I had the _pleasure_ of seeing the ole Islands and Gaps SQL problem out in the wild! It's pretty common actually, but this time
I found myself having to do a little bit of backfilling in addition to the forward filling tasks I have usually been charged with. Let's do a quick
refresher before jumping into the meat of the problem today.

This type of problem can surface in almost any number of ways. The tell is that you are trying to identify if there is a gap in a sequence of some sort,
and fill in that gap to create a more whole data set to work with. The "gap" is the real issue here....not so much _what_ column the gap is occuring in.

In this instance I was working with timeseries data. The data was reporting on occupancy levels in a room in 5 minute increments (e.g. 01:00 UTC, 01:05 UTC, ...).
Unfortunately the data had many of these "gaps". This time this was actually by design.  The particular sensor that was tracking occupancy levels actually did
not report data if there were no changes during the 5 minute interval. So, for example, if 5 people were in a room starting at 2:00 UTC, and they just stayed
in the room for 10 minutes straight before 1 of them decided to leave the room the data would report 5 people occupied the room at the 2:00 UTC, and then the
next row in the data would show there were 4 people in the room at 2:10 UTC.....There would be no row for 2:05 UTC. This is one of those "gaps"! Fortunately for me,
knowing that senor only reported changes meant that I could backfill and forward fill any of these gaps based off the gap's surrounding row's data.


## Filling in the gaps
Now, moving from that previous example to actual data.  See below for the raw, unfilled state of our data set.

|![unfilled_data]({{site.url}}/public/gaps/unfilled_data.png){: .center-image }|
|:--:|
| <b>Note the missing time_partition at the start and end of the hour.</b>|

Alright.  Let's get down to it. 👷

First thing I want to do is go ahead and fill in the missing time partitions just so we can get a complete picture of the hour. The first CTE below just generates some sample
data for demo purposes.  The second, `full_time_series`, makes use of Big Query's `GENERATE_TIMESTAMP_ARRAY` function to......well...like the name states....generate a timestamp array.
The `distinct` in `full_time_series` is a little superfluous for since we only have a single `id` in this example, but it is going to be a requirement if we wanted to apply this query
to data that had multiple `id`s.

```sql
with test_data AS (
      SELECT 1 id, TIMESTAMP('2023-01-01 00:15:00') time_partition, 7 AS occupancy_max, 3 AS occupancy_min, 5 AS occupancy_first, 7 AS occupancy_lASt, 3 AS occupancy_prev UNION ALL
      SELECT 1 id, TIMESTAMP('2023-01-01 00:20:00') time_partition, 4 AS occupancy_max, 4 AS occupancy_min, 4 AS occupancy_first, 4 AS occupancy_lASt, 7 AS occupancy_prev UNION ALL
      SELECT 1 id, TIMESTAMP('2023-01-01 00:25:00') time_partition, 6 AS occupancy_max, 1 AS occupancy_min, 4 AS occupancy_first, 6 AS occupancy_lASt, 4 AS occupancy_prev UNION ALL
      SELECT 1 id, TIMESTAMP('2023-01-01 00:30:00') time_partition, 6 AS occupancy_max, 2 AS occupancy_min, 6 AS occupancy_first, 2 AS occupancy_lASt, 6 AS occupancy_prev UNION ALL
      SELECT 1 id, TIMESTAMP('2023-01-01 00:35:00') time_partition, 5 AS occupancy_max, 2 AS occupancy_min, 2 AS occupancy_first, 5 AS occupancy_lASt, 2 AS occupancy_prev
), full_time_series AS (
  select
      distinct id,
      time_gen
  FROM test_data t
  FULL OUTER JOIN(SELECT time_gen FROM UNNEST(GENERATE_TIMESTAMP_ARRAY('2023-01-01 00:00:00', '2023-01-01 00:59:00', INTERVAL 5 MINUTE)) time_gen)
    ON 1 = 1
)
SELECT * FROM full_time_series;
```

|![full_time_series]({{site.url}}/public/gaps/full_time_series.png){: .center-image }|
|:--:|
| <b>Voila</b>|

Next, let's join that full hour's five minute interval timeseries to our gap data.

```sql
 _grps AS (
  SELECT
    f.id,
    f.time_gen,
    t.occupancy_max,
    t.occupancy_min,
    t.occupancy_first,
    t.occupancy_last,
    t.occupancy_prev,
    count(t.occupancy_prev) OVER (PARTITION BY f.id ORDER BY f.time_gen) forward_fill_grp,
    count(t.occupancy_prev) OVER (PARTITION BY f.id ORDER BY f.time_gen DESC) backfill_grp
  FROM full_time_series f
  LEFT JOIN test_data t ON f.id = t.id AND f.time_gen = t.time_partition
)
select * FROM _grps ORDER BY id, time_gen
```

|![grps]({{site.url}}/public/gaps/grps.png){: .center-image }|
|:--:|
| <b>Here we can clearly see the null values for the gap rows we filled in with our select from full_time_series.</b>|

Before moving on, we need to examine the two `count()` window functions.  They are going to be very useful in our final query. The first, `forward_fill_grp`,
is going to help us identify where our "real" data ends and our filled-gap data starts. For example, above we can see that row 8 has a `forward_fill_grp` of `5`.
That `5` value also applies to the filled in timeseries data we joined to the `test_data` CTE to help fill'er up. The second window function, `backfill_grp` does
the exact same thing but in reverse!

Using these two window functions I can now backfill all the filled in rows with the first non-NULL `occupancy_prev` value we have, and forward fill using the last
non-NULL `occupancy_last` value too!

```sql
filled AS (
  SELECT
    id,
    time_gen,
    CASE
      WHEN occupancy_max IS NULL AND forward_fill_grp = 0 THEN FIRST_VALUE(occupancy_prev) OVER (PARTITION BY id, backfill_grp ORDER BY time_gen DESC)
      WHEN occupancy_max IS NULL AND forward_fill_grp > 0 THEN FIRST_VALUE(occupancy_last) OVER (PARTITION BY id, forward_fill_grp ORDER BY time_gen ASC)
      ELSE occupancy_max
    END as occupancy_max,
    CASE
      WHEN occupancy_min IS NULL AND forward_fill_grp = 0 THEN FIRST_VALUE(occupancy_prev) OVER (PARTITION BY id, backfill_grp ORDER BY time_gen DESC)
      WHEN occupancy_min IS NULL AND forward_fill_grp > 0 THEN FIRST_VALUE(occupancy_last) OVER (PARTITION BY id, forward_fill_grp ORDER BY time_gen ASC)
      ELSE occupancy_min
    END as occupancy_min,
    CASE
      WHEN occupancy_first IS NULL AND forward_fill_grp = 0 THEN FIRST_VALUE(occupancy_prev) OVER (PARTITION BY id, backfill_grp ORDER BY time_gen DESC)
      WHEN occupancy_first IS NULL AND forward_fill_grp > 0 THEN FIRST_VALUE(occupancy_last) OVER (PARTITION BY id, forward_fill_grp ORDER BY time_gen ASC)
      ELSE occupancy_first
    END as occupancy_first,
    CASE
      WHEN occupancy_last IS NULL AND forward_fill_grp = 0 THEN FIRST_VALUE(occupancy_prev) OVER (PARTITION BY id, backfill_grp ORDER BY time_gen DESC)
      WHEN occupancy_last IS NULL AND forward_fill_grp > 0 THEN FIRST_VALUE(occupancy_last) OVER (PARTITION BY id, forward_fill_grp ORDER BY time_gen ASC)
      ELSE occupancy_last
    END as occupancy_last,
    CASE
      WHEN occupancy_prev IS NULL AND forward_fill_grp = 0 THEN FIRST_VALUE(occupancy_prev) OVER (PARTITION BY id, backfill_grp ORDER BY time_gen DESC)
      WHEN occupancy_prev IS NULL AND forward_fill_grp > 0 THEN FIRST_VALUE(occupancy_last) OVER (PARTITION BY id, forward_fill_grp ORDER BY time_gen ASC)
      ELSE occupancy_prev
    END as occupancy_prev
  FROM _grps
)
SELECT * FROM filled ORDER BY id, time_gen
```

|![filled]({{site.url}}/public/gaps/filled.png){: .center-image }|
|:--:|
| <b>A little color coding for y'all.</b>|


I could have also accomplished this same effect by using Big Query's `IF()` function, but, in my personal opinion, things start to look a little muddled if we go
down that route. But, hey.  You do you.

```sql
CASE
    WHEN occupancy_max IS NULL AND forward_fill_grp = 0 THEN FIRST_VALUE(occupancy_prev) OVER (PARTITION BY id, backfill_grp ORDER BY time_gen DESC)
    WHEN occupancy_max IS NULL AND forward_fill_grp > 0 THEN FIRST_VALUE(occupancy_last) OVER (PARTITION BY id, forward_fill_grp ORDER BY time_gen ASC)
    ELSE occupancy_max
END as occupancy_max

-- VS

IF(occupancy_max is NULL, IF(forward_fill_grp = 0, first_value(occupancy_prev) over(partition by id, backfill_grp order by time_gen desc), first_value(occupancy_last) over(partition by id, forward_fill_grp order by time_gen)), occupancy_max) as occupancy_max
```



## Extra Resources
* [GCP's Count](https://cloud.google.com/bigquery/docs/reference/standard-sql/functions-and-operators#count)
* [GCP's If](https://cloud.google.com/bigquery/docs/reference/standard-sql/functions-and-operators#if)
