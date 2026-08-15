---
type: Overview
title: Introduction to loading data
description: Describes loading data with ELT and ETL data integration in BigQuery.
resource: https://docs.cloud.google.com/bigquery/docs/loading-data
tags:
  - bigquery
  - home
  - documentation
  - data-analytics
  - guides
  - load
  - elt
  - etl
status: stable
generated:
  by: docgen/okf-parser-v0.2
  at: '2026-08-15T23:13:59.105Z'
verified:
  by: process:crawler
  at: '2026-08-15T23:13:59.105Z'
sources:
  - id: src-introduction-to-load
    resource: https://docs.cloud.google.com/bigquery/docs/loading-data
    title: Introduction to loading data
    author: Google Cloud Documentation
    last_modified: '2026-08-15'
---

# Introduction to loading data

# Introduction to loading data

This document explains how you can load data into BigQuery. The two common approaches to data integration are to extract, load, and transform (ELT) or to extract, transform, load (ETL) data.

For an overview of ELT and ETL approaches, see [Introduction to loading, transforming, and exporting data](/overview.md).

## Methods of loading or accessing external data

In the BigQuery page, in the [**Add data** dialog](/use-the-console/bigquery-web-ui.md#studio-overview), you can view all available methods to load data into BigQuery or access data from BigQuery. Choose one of the following options based on your use case and data sources:

| Loading method | Description |
| --- | --- |
| **Batch load** | This method is suitable for batch loading large volumes of data from a variety of sources.  
  
For batch or incremental loading of data from Cloud Storage and other supported data sources, we recommend using the [BigQuery Data Transfer Service](/bigquery/docs/dts-introduction).  
  
With the BigQuery Data Transfer Service, to automate data loading pipelines into BigQuery, you can schedule load jobs. You can schedule one-time or batch data transfers at regular intervals (for example, daily or monthly). To ensure that your BigQuery data is always current, you can monitor and log your transfers.  
  
For a list of data sources supported by the BigQuery Data Transfer Service, see [Supported data sources](/bigquery/docs/dts-introduction#supported_data_sources). |
| **Streaming load** | This method enables loading data in near real time from messaging systems.  
  
To stream data into BigQuery, you can use a BigQuery subscription in [Pub/Sub](/pubsub/docs/overview). Pub/Sub can handle high throughput of data loads into BigQuery. It supports real-time data streaming, loading data as it's generated. For more information, see [BigQuery subscriptions](/pubsub/docs/bigquery). |
| **Change Data Capture (CDC)** | This method enables replicating data from databases to BigQuery in near real time.  
  
[Datastream](/datastream/docs/overview) can stream data from databases to BigQuery data with near real-time replication. Datastream leverages CDC capabilities to track and replicate row-level changes from your data sources.  
  
For a list of data sources supported by Datastream, see [Sources](/datastream/docs/sources). |
| **Federation to external data sources** | This method enables access to external data without loading it into BigQuery.  
  
BigQuery supports accessing select [external data sources](/bigquery/docs/external-data-sources) through Cloud Storage and federated queries. The advantage of this method is that you don't need to load the data before transforming it for subsequent use. You can perform the transformation by running `SELECT` statements over the external data. |

You can also use the following programmatic methods to load the data:

| Loading method | Description |
| --- | --- |
| **Batch load** | You can [load data from Cloud Storage or from a local file](/bigquery/docs/batch-loading-data) by creating a load job.  
  
If your source data changes infrequently, or you don't need continuously updated results, load jobs can be a less expensive, less resource-intensive way to load your data into BigQuery.  
  
The loaded data can be in Avro, CSV, JSON, ORC, or Parquet format. To create the load job, you can also use the [`LOAD DATA`](/bigquery/docs/reference/standard-sql/load-statements) SQL statement.  
  
Popular open source systems, such as [Spark](/dataproc/docs/tutorials/bigquery-connector-spark-example) and various [ETL partners](/overview/bigquery-ready-partners.md#etl-data-integration), also support batch loading data into BigQuery.  
  
To optimize batch loading into tables to avoid reaching the daily load limit, see [Optimize load jobs](/bigquery/docs/optimize-load-jobs). |
| **Streaming load** | If you must support custom streaming data sources, or preprocess data before streaming it with large throughput into BigQuery, use [Dataflow](/dataflow/docs).  
  
For more information about loading from Dataflow to BigQuery, see [Write from Dataflow to BigQuery](/dataflow/docs/guides/write-to-bigquery).  
  
You can also directly use the [BigQuery Storage Write API (gRPC)](/bigquery/docs/write-api).  
  
To optimize streaming into tables to avoid reaching the daily load limit, see [Optimize load jobs](/bigquery/docs/optimize-load-jobs). |

[Cloud Data Fusion](/data-fusion/docs/concepts/overview) can help facilitate your ETL process. BigQuery also works with [3rd party partners that transform and load data into BigQuery](/overview/bigquery-ready-partners.md#etl-data-integration).

BigQuery lets you create external connections to query data that's stored outside of BigQuery in Google Cloud services like Cloud Storage or Spanner, or in third-party sources like Amazon Web Services (AWS) or Microsoft Azure. These external connections use the BigQuery Connection API. For more information, see [Introduction to connections](/bigquery/docs/connections-api-intro).

## Other ways to acquire data

You can run queries on data without loading it into BigQuery yourself. The following sections describe some alternatives.

The following list describes some of the alternatives:

### Run queries on public data

Public datasets are datasets stored in BigQuery and shared with the public. For more information, see [BigQuery public datasets](/bigquery/public-data).

### Run queries on shared data

To run queries on a BigQuery dataset that someone has shared with you, see [Introduction to BigQuery sharing (formerly Analytics Hub)](/bigquery/docs/analytics-hub-introduction). Sharing is a data exchange platform that enables data sharing.

### Run queries with log data

You can run queries on logs without creating additional load jobs:

*   **Cloud Logging** lets you [route logs to a BigQuery destination](/logging/docs/export/configure_export).
    
*   **Observability Analytics** lets you [run queries that analyze your log data](/logging/docs/log-analytics#analytics).
    

## What's next

*   Learn how to [prepare data](/transform-data/data-prep-introduction.md) with Gemini in BigQuery.
*   Learn more about transforming data with [Dataform](/dataform/docs/overview).
*   Learn more about monitoring load jobs in the [jobs explorer](/bigquery/docs/admin-jobs-explorer) and [BigQuery metrics](/monitoring/api/metrics_gcp_a_b#gcp-bigquery).

---

[^src-introduction-to-load]: [Introduction to loading data](https://docs.cloud.google.com/bigquery/docs/loading-data) - Google Cloud Documentation
