---
type: Guide
title: Load and query data
description: Create a dataset, load data into a table, and query that data using BigQuery Studio.
resource: https://docs.cloud.google.com/bigquery/docs/quickstarts/load-data-console
tags:
  - bigquery
  - home
  - documentation
  - data-analytics
  - guides
  - load
  - dataset
  - table
status: stable
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

# Load and query data

> [!TIP]
> This guide includes a sanctioned executable computation: [Load and query data Computation](/computations/comp-load-and-query-data.md)

# Load and query data

Get started with BigQuery by creating a dataset, loading data into a table, and querying the table.

---

To follow step-by-step guidance for this task directly in the Google Cloud console, click **Guide me**:

---

## Before you begin

*   Sign in to your Google Cloud account. If you're new to Google Cloud, [create an account](https://console.cloud.google.com/freetrial) to evaluate how our products perform in real-world scenarios. New customers also get $300 in free credits to run, test, and deploy workloads.
*   In the Google Cloud console, on the project selector page, select or create a Google Cloud project.
    
    **Roles required to select or create a project**
    
    *   **Select a project**: Selecting a project doesn't require a specific IAM role—you can select any project that you've been granted a role on.
    *   **Create a project**: To create a project, you need the Project Creator role (`roles/resourcemanager.projectCreator`), which contains the `resourcemanager.projects.create` permission. [Learn how to grant roles](/iam/docs/granting-changing-revoking-access).
    
    > [!NOTE]
    > **Note**: If you don't plan to keep the resources that you create in this procedure, create a project instead of selecting an existing project. After you finish these steps, you can delete the project, removing all resources associated with the project.
    
*   If you're using an existing project for this guide, [verify that you have the permissions required to complete this guide](#required_roles). If you created a new project, then you already have the required permissions.
    

*   In the Google Cloud console, on the project selector page, select or create a Google Cloud project.
    
    **Roles required to select or create a project**
    
    *   **Select a project**: Selecting a project doesn't require a specific IAM role—you can select any project that you've been granted a role on.
    *   **Create a project**: To create a project, you need the Project Creator role (`roles/resourcemanager.projectCreator`), which contains the `resourcemanager.projects.create` permission. [Learn how to grant roles](/iam/docs/granting-changing-revoking-access).
    
    > [!NOTE]
    > **Note**: If you don't plan to keep the resources that you create in this procedure, create a project instead of selecting an existing project. After you finish these steps, you can delete the project, removing all resources associated with the project.
    
*   If you're using an existing project for this guide, [verify that you have the permissions required to complete this guide](#required_roles). If you created a new project, then you already have the required permissions.
    

2.  Enable the BigQuery API.
    
    **Roles required to enable APIs**
    
    To enable APIs, you need the `serviceusage.services.enable` permission. If you created the project, then you likely already have this permission through the Owner role (`roles/owner`). Otherwise, you can get this permission through the Service Usage Admin role (`roles/serviceusage.serviceUsageAdmin`). [Learn how to grant roles](/iam/docs/granting-changing-revoking-access).
    
    For new projects, the BigQuery API is automatically enabled.
    
3.  Optional: [Enable billing](/billing/docs/how-to/modify-project) for the project. If you don't want to enable billing or provide a credit card, the steps in this document still work. BigQuery provides you a sandbox to perform the steps. For more information, see [Enable the BigQuery sandbox](/bigquery/docs/sandbox#setup).
    
    > [!NOTE]
    > **Note:** If your project has a billing account and you want to use the BigQuery sandbox, then [disable billing for your project](/billing/docs/how-to/modify-project#disable_billing_for_a_project).
    

### Required roles

To get the permissions that you need to create a dataset, create a table, load data, and query data, ask your administrator to grant you the following IAM roles on the project:

*   Run load jobs and query jobs: [BigQuery Job User](/iam/docs/roles-permissions/bigquery#bigquery.jobUser) (`roles/bigquery.jobUser`)
*   Create a dataset, create a table, load data into a table, and query a table: [BigQuery Data Editor](/iam/docs/roles-permissions/bigquery#bigquery.dataEditor) (`roles/bigquery.dataEditor`)

For more information about granting roles, see [Manage access to projects, folders, and organizations](/iam/docs/granting-changing-revoking-access).

You might also be able to get the required permissions through [custom roles](/iam/docs/creating-custom-roles) or other [predefined roles](/iam/docs/roles-overview#predefined).

## Create a BigQuery dataset

Use the Google Cloud console to create a dataset to store the data. You create your dataset in the US multi-region location. For information on BigQuery regions and multi-regions, see [Locations](/bigquery/docs/dataset-locations).

1.  In the Google Cloud console, open the BigQuery page.
2.  In the left pane, click **Explorer**.
3.  In the **Explorer** pane, click your project name.
4.  Click **View actions**.
5.  Select **Create dataset**.
6.  On the **Create dataset** page, do the following:

1.  For **Dataset ID**, enter `babynames`.
2.  For **Location type**, select **Multi-region**, and then choose **US (multiple regions in United States)**. The public datasets are stored in the `us` multi-region location. For simplicity, store your dataset in the same location.
3.  Leave the remaining default settings as they are, and click **Create dataset**.

## Download the file that contains the source data

The file that you're downloading contains approximately 7 MB of data about popular baby names. It's provided by the US Social Security Administration.

For more information about the data, see the Social Security Administration's [Background information for popular names](http://www.ssa.gov/OACT/babynames/background.html).

1.  Download the US Social Security Administration's data by opening the following URL in a new browser tab:
    
    ```
    https://www.ssa.gov/OACT/babynames/names.zip
    ```
    
2.  Extract the file.
    
    For more information about the dataset schema, see the zip file's `NationalReadMe.pdf` file.
    
3.  To see what the data looks like, open the `yob2024.txt` file. This file contains comma-separated values for name, assigned sex at birth, and number of children with that name. The file has no header row.
    
4.  Note the location of the `yob2024.txt` file so that you can find it later.
    

## Load data into a table

Next, load the data into a new table.

1.  In the left pane, click **Explorer**.
2.  In the **Explorer** pane, expand your project name.
3.  Click **Datasets** and then next to the **babynames** dataset, click **View actions** and select **Open**.
4.  Click **Create table**.
    
    Unless otherwise indicated, use the default values for all settings.
    
5.  On the **Create table** page, do the following:

1.  In the **Source** section, for **Create table from**, choose **Upload** from the list.
2.  In the **Select file** field, click **Browse**.
3.  Navigate to and open your local `yob2024.txt` file, and click **Open**.
4.  From the **File format** list, choose **CSV**.
5.  In the **Destination** section, in the **Table** field, enter `names_2024`.
6.  In the **Schema** section, click the **Edit as text** toggle, and paste the following schema definition into the text field:

```
name:string,assigned_sex_at_birth:string,count:integer
```

9.  Click **Create table**.
    
    Wait for BigQuery to create the table and load the data.
    

## Preview table data

To preview the table data, follow these steps:

1.  In the left pane, click **Explorer**.
2.  In the **Explorer** pane, expand your project and click **Datasets**.
3.  Click the `babynames` dataset, and then select the `names_2024` table.
4.  Click the **Preview** tab. BigQuery displays the first few rows of the table.
![The table preview tab.](/static/bigquery/images/table-preview-ui.png)

The **Preview** tab is not available for all table types. For example, the **Preview** tab is not displayed for external tables or views.

## Query table data

Next, query the table.

1.  Next to the **names\_2024** tab, click the **SQL query** option. A new editor tab opens.
2.  In the query editor, paste the following query. This query retrieves the top five names for babies born in the US that were assigned male at birth in 2024.  
    
      ```sql
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
      
3.  Click **Run**. The results are displayed in the **Query results** section.  
    ![The query results panel](/static/bigquery/images/names-query-results.png)

You have successfully queried a table in a public dataset and then loaded your sample data into BigQuery using the Google Cloud console.

## Clean up

To avoid incurring charges to your Google Cloud account for the resources used on this page, follow these steps.

1.  In the Google Cloud console, open the BigQuery page.
2.  In the left pane, click **Explorer**.
3.  In the **Explorer** pane, click **Datasets** and then click the `babynames` dataset that you created.
4.  Expand the **View actions** option and click **Delete**.
5.  In the **Delete dataset** dialog, confirm the delete command: type the word `delete` and then click **Delete**.

## What's next

*   To learn more about loading data into BigQuery, see [Introduction to loading data](/load-data/loading-data.md).
*   To learn more about querying data, see [Overview of BigQuery analytics](/bigquery/docs/query-overview).
*   To learn how to load a JSON file with nested and repeated data, see [Loading nested and repeated JSON data](/bigquery/docs/loading-data-cloud-storage-json#loading_nested_and_repeated_json_data).
*   To learn more about accessing BigQuery programmatically, see the [REST API](/bigquery/docs/reference/rest/v2) reference or the [BigQuery client libraries](/bigquery/docs/reference/libraries) page.

---

[^src-load-and-query-data]: [Load and query data](https://docs.cloud.google.com/bigquery/docs/quickstarts/load-data-console) - Google Cloud Documentation
