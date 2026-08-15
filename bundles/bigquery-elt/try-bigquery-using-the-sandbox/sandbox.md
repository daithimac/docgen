---
type: Guide
title: Try BigQuery using the sandbox
description: >-
  Use the BigQuery sandbox to query a public dataset and visualize the results, learn about the
  BigQuery sandbox limitations, and learn how to upgrade from the BigQuery sandbox.
resource: https://docs.cloud.google.com/bigquery/docs/sandbox
tags:
  - bigquery
  - home
  - documentation
  - data-analytics
  - guides
  - dataset
status: stable
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

# Try BigQuery using the sandbox

> [!TIP]
> This guide includes a sanctioned executable computation: [Try BigQuery using the sandbox Computation](/computations/comp-try-bigquery-using-the-sa.md)

# Try BigQuery using the sandbox

The BigQuery sandbox lets you explore limited BigQuery capabilities at no cost to confirm whether BigQuery fits your needs. The BigQuery sandbox lets you experience BigQuery without providing a credit card or creating a billing account for your project. If you already created a billing account, you can still use BigQuery at no cost in the free usage tier.

The BigQuery sandbox lets you learn BigQuery with a limited set of BigQuery features at no charge. You can evaluate BigQuery by using the BigQuery sandbox to view and query a public dataset.

Google Cloud offers public datasets that are stored in BigQuery and made available to the general public through the [Google Cloud Public Dataset Program](https://cloud.google.com/datasets). For more information about working with public datasets, see [BigQuery public datasets](/bigquery/public-data).

---

To follow step-by-step guidance for this task directly in the Google Cloud console, click **Guide me**:

---

## Before you begin

### Enable the BigQuery sandbox

1.  In the Google Cloud console, go to the **BigQuery** page.
    
    You can also open BigQuery in the Google Cloud console by entering the following URL in your browser:
    
    ```
    https://console.cloud.google.com/bigquery
    ```
    
    The Google Cloud console is the graphical interface that you use to create and manage BigQuery resources and to run SQL queries.
    
2.  Authenticate with your Google Account, or create a new one.
    
3.  On the welcome page, do the following:
    
    1.  For **Country**, select your country.
        
    2.  For **Terms of Service**, select the checkbox if you agree to the terms of service.
        
    3.  Optional: If you are asked about email updates, select the checkbox if you want to receive email updates.
        
    4.  Click **Agree and continue**.
        
    
    ![Items on the BigQuery sandbox welcome page.](/static/bigquery/images/sandbox-welcome.png)
    
4.  Click **Create project**.
    
5.  On the **New Project** page, do the following:
    
    1.  For **Project name**, enter a name for your project.
        
    2.  For **Organization**, select an organization or select **No organization** if you are not part of one. Managed accounts, such as those associated with academic institutions, must select an organization.
        
    3.  If you are asked to select a **Location**, click **Browse** and select a location for your project.
        
    4.  Click **Create**. You are redirected back to the **BigQuery** page in the Google Cloud console.
        
    
    ![BigQuery sandbox project creation page.](/static/bigquery/images/sandbox-project.png)
    

You have successfully enabled the BigQuery sandbox. A BigQuery sandbox notice is now displayed on the **BigQuery** page:

![The confirmation notice provides the option to upgrade to the full BigQuery experience.](/static/bigquery/images/sandbox-confirmation.png)

## Limitations

The BigQuery sandbox is subject to the following limits:

*   All BigQuery [quotas and limits](/technology-areas/quotas.md) apply.
*   You are granted the same free usage limits as the BigQuery [free tier](https://cloud.google.com/bigquery/pricing#free-tier), including 10 GB of active storage and 1 TB of processed query data each month.
*   All BigQuery [datasets](/bigquery/docs/datasets-intro) have a [default table expiration time](/bigquery/docs/updating-datasets#table-expiration), and all [tables](/bigquery/docs/tables-intro), [views](/bigquery/docs/views-intro), and [partitions](/bigquery/docs/partitioned-tables) automatically expire after 60 days.
*   The BigQuery sandbox does not support several BigQuery features, including the following:
    
    *   [Streaming data](/bigquery/docs/write-api)
    *   [Data manipulation language (DML) statements](/bigquery/docs/data-manipulation-language)
    *   [BigQuery Data Transfer Service](/bigquery/docs/dts-introduction)

## View a public dataset

BigQuery public datasets are available by default in BigQuery Studio in a project named `bigquery-public-data`. In this tutorial you query the NYC Citi Bike Trips dataset. Citi Bike is a large bike share program, with 10,000 bikes and 600 stations across Manhattan, Brooklyn, Queens, and Jersey City. This dataset includes Citi Bike trips since Citi Bike launched in September 2013.

1.  In the Google Cloud console, go to the **BigQuery** page.
    
2.  In the left pane, click **Explorer**:
    
    ![Highlighted button for the Explorer pane.](/static/bigquery/images/explorer-tab.png)
    
    If you don't see the left pane, click **Expand left pane** to open the pane.
    
3.  In the **Explorer** pane, click **Add data**.
    
4.  In the **Add data** dialog, click ![Public dataset icon on the Filter by page](/static/bigquery/images/icon-public-dataset.png) **Public datasets**.
    
5.  On the **Marketplace** page, in the **Search Marketplace** field, type `NYC Citi Bike Trips` to narrow your search.
    
6.  In the search results, click **NYC Citi Bike Trips**.
    
7.  On the **Product details** page, click **View dataset**. You can view information about the dataset on the **Details** tab.
    

## Query a public dataset

In the following steps, you query the `citibike_trips` table to determine the 100 most popular Citi Bike stations in the NYC Citi Bike Trips public dataset. The query retrieves the station's name and location, and the number of trips that started at that station.

The query uses the [ST\_GEOGPOINT function](/bigquery/docs/reference/standard-sql/geography_functions#st_geogpoint) to create a point from each station's longitude and latitude parameters and returns that point in a `GEOGRAPHY` column. The `GEOGRAPHY` column is used to generate a heatmap in the integrated geography data viewer.

1.  In the Google Cloud console, open the **BigQuery** page.
    
2.  Click **SQL query**.
    
3.  In the query editor, enter the following query:
    
    ```sql
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
    
    If the query is valid, then a check mark appears along with the amount of data that the query processes. If the query is invalid, then an exclamation point appears along with an error message.
    
    ![Query validator](/static/bigquery/images/quickstart-query-validator.png)
    
4.  Click **Run**. The most popular stations are listed in the **Query results** section.
    
    ![Query results in the Google Cloud console](/static/bigquery/images/query-results-ui.png)
    
5.  Optional: To display the duration of the job and the amount of data that the query job processed, click the **Job information** tab in the **Query results** section.
    
6.  Switch to the **Visualization** tab. This tab generates a map to quickly visualize your results.
    
7.  In the **Visualization configuration** panel:
    
    1.  Verify that **Visualization type** is set to **Map**.
    2.  Verify that **Geography column** is set to **`geo_location`**.
    3.  For **Data column**, choose **`num_trips`**.
    4.  Use the **Zoom in** option to reveal the map of Manhattan.
    
    ![A heatmap generated on the Visualization tab](/static/bigquery/images/query-visualization-ui.png)
    

## Upgrade from the BigQuery sandbox

The BigQuery sandbox lets you explore [limited BigQuery capabilities](#limitations) at no cost. When you are ready to increase your storage and query capabilities, upgrade from the BigQuery sandbox.

To upgrade, do the following:

1.  [Enable billing](/billing/docs/how-to/modify-project#enable_billing_for_a_project) for your project.
    
2.  Explore [BigQuery editions](/bigquery/docs/editions-intro) and determine the pricing model that is right for you.
    

Once you have upgraded from the BigQuery sandbox, you should [update the default expiration times for your BigQuery resources](/bigquery/docs/updating-datasets#table-expiration) such as tables, views, and partitions.

## Clean up

To avoid incurring charges to your Google Cloud account for the resources used on this page, follow these steps.

### Delete the project

If you used the [BigQuery sandbox](/try-bigquery-using-the-sandbox/sandbox.md) to query the public dataset, then billing is not enabled for your project, and you don't need to delete the project.

The easiest way to eliminate billing is to delete the project that you created for the tutorial.

To delete the project:

> [!WARNING]
> **Caution**: Deleting a project has the following effects:
> 
> *   **Everything in the project is deleted.** If you used an existing project for the tasks in this document, when you delete it, you also delete any other work you've done in the project.
> *   **Custom project IDs are lost.** When you created this project, you might have created a custom project ID that you want to use in the future. To preserve the URLs that use the project ID, such as an `appspot.com` URL, delete selected resources inside the project instead of deleting the whole project.
> 
> If you plan to explore multiple architectures, tutorials, or quickstarts, reusing projects can help you avoid exceeding project quota limits.

2.  In the Google Cloud console, go to the **Manage resources** page.
    
3.  In the project list, select the project that you want to delete, and then click **Delete**.
4.  In the dialog, type the project ID, and then click **Shut down** to delete the project.

## What's next

*   For more information about using BigQuery at no cost in the free usage tier, see [Free usage tier](https://cloud.google.com/bigquery/pricing#free-tier).
*   Learn how to [create a dataset, load data, and query tables in BigQuery](/load-data/load-data-console.md).

---

[^src-try-bigquery-using-t]: [Try BigQuery using the sandbox](https://docs.cloud.google.com/bigquery/docs/sandbox) - Google Cloud Documentation
