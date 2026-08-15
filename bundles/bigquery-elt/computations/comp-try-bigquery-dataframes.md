---
type: Attested Computation
title: Computation for Try BigQuery DataFrames
description: Sanctioned SQL execution logic derived from Try BigQuery DataFrames.
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
  - id: src-try-bigquery-datafra
    resource: https://docs.cloud.google.com/bigquery/docs/dataframes-quickstart
    title: Try BigQuery DataFrames
    author: Google Cloud Documentation
    last_modified: '2026-08-15'
---

# Computation

```bigquery
import bigframes.pandas as bpd

# Set BigQuery DataFrames options
# Note: The project option is not required in all environments.
# On BigQuery Studio, the project ID is automatically detected.
bpd.options.bigquery.project = your_gcp_project_id

# Use "partial" ordering mode to generate more efficient queries, but the
# order of the rows in DataFrames may not be deterministic if you have not
# explictly sorted it. Some operations that depend on the order, such as
# head() will not function until you explictly order the DataFrame. Set the
# ordering mode to "strict" (default) for more pandas compatibility.
bpd.options.bigquery.ordering_mode = "partial"

# Create a DataFrame from a BigQuery table
query_or_table = "bigquery-public-data.ml_datasets.penguins"
df = bpd.read_gbq(query_or_table)

# Efficiently preview the results using the .peek() method.
df.peek()
import bigframes.pandas as bpd

# Set BigQuery DataFrames options
# Note: The project option is not required in all environments.
# On BigQuery Studio, the project ID is automatically detected.
bpd.options.bigquery.project = your_gcp_project_id

# Use "partial" ordering mode to generate more efficient queries, but the
# order of the rows in DataFrames may not be deterministic if you have not
# explictly sorted it. Some operations that depend on the order, such as
# head() will not function until you explictly order the DataFrame. Set the
# ordering mode to "strict" (default) for more pandas compatibility.
bpd.options.bigquery.ordering_mode = "partial"

# Create a DataFrame from a BigQuery table
query_or_table = "bigquery-public-data.ml_datasets.penguins"
df = bpd.read_gbq(query_or_table)

# Efficiently preview the results using the .peek() method.
df.peek()
```

This computation represents sanctioned execution logic extracted from the documentation.[^src-try-bigquery-datafra]

[^src-try-bigquery-datafra]: [Try BigQuery DataFrames](https://docs.cloud.google.com/bigquery/docs/dataframes-quickstart)
