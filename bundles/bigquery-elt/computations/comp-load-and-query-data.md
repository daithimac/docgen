---
type: Attested Computation
title: Computation for Load and query data
description: Sanctioned SQL execution logic derived from Load and query data.
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
  at: '2026-08-15T23:13:59.105Z'
verified:
  by: process:crawler
  at: '2026-08-15T23:13:59.105Z'
sources:
  - id: src-load-and-query-data
    resource: https://docs.cloud.google.com/bigquery/docs/quickstarts/load-data-console
    title: Load and query data
    author: Google Cloud Documentation
    last_modified: '2026-08-15'
---

# Computation

```bigquery
SELECT
    name,
    count
  FROM
    `babynames.names_2024`
  WHERE
    assigned_sex_at_birth = 'M'
  ORDER BY
    count DESC
  LIMIT
    5;
  
  SELECT
    name,
    count
  FROM
    `babynames.names_2024`
  WHERE
    assigned_sex_at_birth = 'M'
  ORDER BY
    count DESC
  LIMIT
    5;
```

This computation represents sanctioned execution logic extracted from the documentation.[^src-load-and-query-data]

[^src-load-and-query-data]: [Load and query data](https://docs.cloud.google.com/bigquery/docs/quickstarts/load-data-console)
