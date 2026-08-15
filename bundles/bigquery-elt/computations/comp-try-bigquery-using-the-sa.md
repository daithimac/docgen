---
type: Attested Computation
title: Computation for Try BigQuery using the sandbox
description: Sanctioned SQL execution logic derived from Try BigQuery using the sandbox.
status: stable
runtime: bigquery
parameters:
  - name: project_id
    type: string
    required: false
  - name: dataset_id
    type: string
    required: false
executor:
  resource: references/skills/run-on-bq.md
  receipt:
    - job_id
    - executed_sql
    - result
attester:
  resource: references/attesters/sql-equality.py
generated:
  by: docgen/okf-parser-v0.2
  at: '2026-08-15T23:13:13.623Z'
verified:
  by: process:crawler
  at: '2026-08-15T23:13:13.623Z'
sources:
  - id: src-try-bigquery-using-t
    resource: https://docs.cloud.google.com/bigquery/docs/sandbox
    title: Try BigQuery using the sandbox
    author: Google Cloud Documentation
    last_modified: '2026-08-15'
---

# Computation

```bigquery
SELECT
  start_station_name,
  start_station_latitude,
  start_station_longitude,
  ST_GEOGPOINT(start_station_longitude, start_station_latitude) AS geo_location,
  COUNT(*) AS num_trips
FROM
  `bigquery-public-data.new_york.citibike_trips`
GROUP BY
  1,
  2,
  3
ORDER BY
  num_trips DESC
LIMIT
  100;
SELECT
  start_station_name,
  start_station_latitude,
  start_station_longitude,
  ST_GEOGPOINT(start_station_longitude, start_station_latitude) AS geo_location,
  COUNT(*) AS num_trips
FROM
  `bigquery-public-data.new_york.citibike_trips`
GROUP BY
  1,
  2,
  3
ORDER BY
  num_trips DESC
LIMIT
  100;
```

This computation represents sanctioned execution logic extracted from the documentation.[^src-try-bigquery-using-t]

[^src-try-bigquery-using-t]: [Try BigQuery using the sandbox](https://docs.cloud.google.com/bigquery/docs/sandbox)
