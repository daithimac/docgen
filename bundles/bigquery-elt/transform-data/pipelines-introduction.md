---
type: Overview
title: Introduction to BigQuery pipelines
description: >-
  Streamline data tasks with BigQuery pipelines. Create, manage, and schedule sequences of notebooks
  and SQL queries for efficient data pipelines.
resource: https://docs.cloud.google.com/bigquery/docs/pipelines-introduction
tags:
  - bigquery
  - home
  - documentation
  - data-analytics
  - guides
  - sql
  - pipeline
status: stable
generated:
  by: docgen/okf-parser-v0.2
  at: '2026-08-15T23:13:59.105Z'
verified:
  by: process:crawler
  at: '2026-08-15T23:13:59.105Z'
sources:
  - id: src-introduction-to-bigq
    resource: https://docs.cloud.google.com/bigquery/docs/pipelines-introduction
    title: Introduction to BigQuery pipelines
    author: Google Cloud Documentation
    last_modified: '2026-08-15'
---

# Introduction to BigQuery pipelines

# Introduction to BigQuery pipelines

You can use BigQuery pipelines to automate and streamline your BigQuery data processes. With pipelines, you can schedule and execute code assets in sequence to improve efficiency and reduce manual effort.

## Overview

Pipelines are powered by [Dataform](/dataform/docs/overview). In addition to executing code assets, Dataform automatically updates metadata in Knowledge Catalog for tables created within a pipeline.

A pipeline consists of one or more of the following code assets:

*   [Notebooks](/bigquery/docs/notebooks-introduction)
*   [SQL queries](/bigquery/docs/reference/standard-sql/query-syntax)
*   [Data preparations](/transform-data/data-prep-introduction.md)
*   SQLX tasks, including tables, views, sources, and data quality tests

You can use pipelines to schedule the execution of code assets. For example, you can schedule a SQL query to run daily and update a table with the most recent source data, which can then power a dashboard.

In a pipeline with multiple code assets, you define the execution sequence. For example, to train a machine learning model, you can create a workflow in which a SQL query prepares data, and then a subsequent notebook trains the model using that data.

When you trigger a pipeline run, BigQuery executes the actions in the order defined by their dependencies. For each action, BigQuery performs the following steps:

1.  Executes the compiled SQL in BigQuery.
2.  Updates the action status in the execution log.
3.  Upon successful completion of an action, Dataform automatically initiates a metadata sync to Knowledge Catalog ([Preview](https://cloud.google.com/products#product-launch-stages)). This enrichment process updates Knowledge Catalog with the semantic metadata defined in your SQLX configuration. The sync happens asynchronously and utilizes a retry mechanism, ensuring that metadata updates don't impact your pipeline latency or lead to workflow failures if the Dataplex API is temporarily unavailable.

## Capabilities

You can do the following in a pipeline:

*   [Create new or import existing](/bigquery/docs/create-pipelines#add_a_pipeline_task) SQL queries, notebooks, data preparations, or SQLX tasks into a pipeline.
*   [Schedule a pipeline](/bigquery/docs/schedule-pipelines) to automatically run at a specified time and frequency.
*   [Share a pipeline](/bigquery/docs/create-pipelines#share_a_pipeline) with users or groups you specify.
*   [Share a link to a pipeline](/bigquery/docs/create-pipelines#share_a_link_to_a_pipeline).

## Limitations

Pipelines are subject to the following limitations:

*   Pipelines are available only in the Google Cloud console.
*   You can't change the region for storing a pipeline after it is created.
*   You can grant users or groups access to a selected pipeline, but you can't grant them access to individual tasks within the pipeline.
*   If a scheduled pipeline run doesn't finish before the start of the next scheduled run, the next scheduled run is skipped and marked with an error.

## Set the default region for code assets

All new code assets in your Google Cloud project use a default region. After the asset is created, you can't change its region.

**Important:** If you change the region while creating a code asset, that region becomes the default for all subsequent code assets. Existing code assets are not affected.

To set the default region for new code assets, do the following:

1.  Go to the **BigQuery** page.
    
2.  In the left pane, click **Files** to open the file browser:
    
    ![Click \*\*Files\*\* to open the file browser.](/static/bigquery/images/select-file-browser.png)
    
3.  Next to the project name, click **View files panel actions** \> **Switch code region**.
    
4.  Select the code region that you want to use as a default.
    
5.  Click **Save**.
    

For a list of supported regions, see [BigQuery Studio locations](/bigquery/docs/locations#bqstudio-loc).

All code assets are stored in your [default region for code assets](#set_the_default_region_for_code_assets). Updating the default region changes the region for all code assets created after that point.

## Quotas and limits

BigQuery pipelines are subject to [Dataform quotas and limits](/dataform/docs/quotas).

## Pricing

The execution of BigQuery pipeline tasks incurs compute and storage charges in BigQuery. For more information, see [BigQuery pricing](https://cloud.google.com/bigquery/pricing).

Pipelines containing notebooks incur Colab Enterprise runtime charges based on the [default machine type](/colab/docs/runtimes#default_runtime_specifications). For pricing details, see [Colab Enterprise pricing](https://cloud.google.com/colab/pricing).

Each BigQuery pipeline run is logged using [Cloud Logging](/logging/docs). Logging is automatically enabled for BigQuery pipeline runs, which can incur Cloud Logging billing charges. For more information, see [Cloud Logging pricing](https://cloud.google.com/logging/pricing).

## What's next

*   Learn how to [create pipelines](/bigquery/docs/create-pipelines).
*   Learn how to [manage pipelines](/bigquery/docs/manage-pipelines).
*   Learn how to [schedule pipelines](/bigquery/docs/schedule-pipelines).

---

[^src-introduction-to-bigq]: [Introduction to BigQuery pipelines](https://docs.cloud.google.com/bigquery/docs/pipelines-introduction) - Google Cloud Documentation
