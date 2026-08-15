---
type: Overview
title: Introduction to data export
description: Describes the different ways to export data from BigQuery tables.
resource: https://docs.cloud.google.com/bigquery/docs/export-intro
tags:
  - bigquery
  - home
  - documentation
  - data-analytics
  - guides
  - export
  - table
status: stable
generated:
  by: docgen/okf-parser-v0.2
  at: '2026-08-15T23:13:59.105Z'
verified:
  by: process:crawler
  at: '2026-08-15T23:13:59.105Z'
sources:
  - id: src-introduction-to-data
    resource: https://docs.cloud.google.com/bigquery/docs/export-intro
    title: Introduction to data export
    author: Google Cloud Documentation
    last_modified: '2026-08-15'
---

# Introduction to data export

# Introduction to data export

This document describes the different ways of exporting data from BigQuery.

For more information about data integrations, see [Introduction to loading, transforming, and exporting data](/overview.md).

## Export query results

You can export query results to a local file (either as a CSV or JSON file), Google Drive, or Google Sheets. For more information, see [Export query results to a file](/bigquery/docs/export-file).

## Export tables

You can export your BigQuery tables in the following data formats:

| Data format | Supported compression types | Supported export methods |
| --- | --- | --- |
| CSV | GZIP | [Export to Cloud Storage](/bigquery/docs/exporting-data) |
| JSON | GZIP | [Export to Cloud Storage](/bigquery/docs/exporting-data)  
[Read from BigQuery using Dataflow](/dataflow/docs/guides/read-from-bigquery) |
| Avro | DEFLATE, SNAPPY | [Export to Cloud Storage](/bigquery/docs/exporting-data)  
[Read from BigQuery using Dataflow](/dataflow/docs/guides/read-from-bigquery) |
| Parquet | GZIP, SNAPPY, ZSTD | [Export to Cloud Storage](/bigquery/docs/exporting-data) |

You can also [export your BigQuery tables as Protobuf columns](/bigquery/docs/protobuf-export) when working with nested data structures that require object type safety, or if you need a wider language support.

## Export BigQuery code assets

You can download [BigQuery Studio](/bigquery/docs/query-overview#bigquery-studio) code assets, such as [saved queries](/bigquery/docs/saved-queries-introduction) or [notebooks](/bigquery/docs/notebooks-introduction) to maintain a local copy of your assets. For more information on downloading your BigQuery code assets, see the following:

*   [Download saved queries](/bigquery/docs/manage-saved-queries#download_saved_queries)
*   [Download notebooks](/bigquery/docs/manage-notebooks#download_a_notebook)

## Export using reverse ETL

You can set up reverse ETL (RETL) workflows to move data from BigQuery to the following databases:

*   [Export to Bigtable](/bigquery/docs/export-to-bigtable)
*   [Export to Spanner](/bigquery/docs/export-to-spanner)
*   [Export to Pub/Sub](/bigquery/docs/export-to-pubsub)
*   [Export to AlloyDB](/bigquery/docs/export-to-alloydb) ([preview](https://cloud.google.com/products#product-launch-stages))

## What's next

*   Learn about [quotas for extract jobs](/bigquery/quotas#export_jobs).
*   Learn about [BigQuery storage pricing](https://cloud.google.com/bigquery/pricing#storage).

---

[^src-introduction-to-data]: [Introduction to data export](https://docs.cloud.google.com/bigquery/docs/export-intro) - Google Cloud Documentation
