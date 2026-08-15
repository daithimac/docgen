---
type: Guide
title: Explore BigQuery in the Google Cloud console
description: >-
  Shows how to use the Google Cloud console to work with BigQuery projects, display resources (such
  as datasets and tables), compose and run SQL queries, and view query and job histories.
resource: https://docs.cloud.google.com/bigquery/docs/bigquery-web-ui
tags:
  - bigquery
  - home
  - documentation
  - data-analytics
  - guides
  - sql
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
  - id: src-explore-bigquery-in-
    resource: https://docs.cloud.google.com/bigquery/docs/bigquery-web-ui
    title: Explore BigQuery in the Google Cloud console
    author: Google Cloud Documentation
    last_modified: '2026-08-15'
---

# Explore BigQuery in the Google Cloud console

# Explore BigQuery in the Google Cloud console

The BigQuery Google Cloud console is a graphical interface where you can create and manage your BigQuery resources. You can use the Google Cloud console to view tables and datasets, create and run SQL queries, build pipelines, and perform other tasks to help you manage your BigQuery workflows.

## Before you begin

*   Sign in to your Google Cloud account. If you're new to Google Cloud, [create an account](https://console.cloud.google.com/freetrial) to evaluate how our products perform in real-world scenarios. New customers also get $300 in free credits to run, test, and deploy workloads.
*   In the Google Cloud console, on the project selector page, select or create a Google Cloud project.
    
    **Roles required to select or create a project**
    
    *   **Select a project**: Selecting a project doesn't require a specific IAM role—you can select any project that you've been granted a role on.
    *   **Create a project**: To create a project, you need the Project Creator role (`roles/resourcemanager.projectCreator`), which contains the `resourcemanager.projects.create` permission. [Learn how to grant roles](/iam/docs/granting-changing-revoking-access).
    
    > [!NOTE]
    > **Note**: If you don't plan to keep the resources that you create in this procedure, create a project instead of selecting an existing project. After you finish these steps, you can delete the project, removing all resources associated with the project.
    

*   In the Google Cloud console, on the project selector page, select or create a Google Cloud project.
    
    **Roles required to select or create a project**
    
    *   **Select a project**: Selecting a project doesn't require a specific IAM role—you can select any project that you've been granted a role on.
    *   **Create a project**: To create a project, you need the Project Creator role (`roles/resourcemanager.projectCreator`), which contains the `resourcemanager.projects.create` permission. [Learn how to grant roles](/iam/docs/granting-changing-revoking-access).
    
    > [!NOTE]
    > **Note**: If you don't plan to keep the resources that you create in this procedure, create a project instead of selecting an existing project. After you finish these steps, you can delete the project, removing all resources associated with the project.
    

2.  Enable the BigQuery API.
    
    **Roles required to enable APIs**
    
    To enable APIs, you need the `serviceusage.services.enable` permission. If you created the project, then you likely already have this permission through the Owner role (`roles/owner`). Otherwise, you can get this permission through the Service Usage Admin role (`roles/serviceusage.serviceUsageAdmin`). [Learn how to grant roles](/iam/docs/granting-changing-revoking-access).
    
    For new projects, the BigQuery API is automatically enabled.
    
3.  Optional: [Enable billing](/billing/docs/how-to/modify-project) for the project. If you don't want to enable billing or provide a credit card, the steps in this document still work. BigQuery provides you a sandbox to perform the steps. For more information, see [Enable the BigQuery sandbox](/bigquery/docs/sandbox#setup).
    
    > [!NOTE]
    > **Note:** If your project has a billing account and you want to use the BigQuery sandbox, then [disable billing for your project](/billing/docs/how-to/modify-project#disable_billing_for_a_project).
    

## Open the Google Cloud console

1.  Go to the Google Cloud console.
    
2.  In the Google Cloud console toolbar, click **Navigation menu**.
    
3.  Click **Solutions \> All products**.
    
4.  In the **Analytics** section, click **BigQuery**.
    
    The BigQuery [**Studio**](#open-ui) page opens.
    
5.  To expand or collapse the menu, click or **Toggle BigQuery navigation menu**.
    
    ![The BigQuery navigation menu.](https://docs.cloud.google.com/bigquery/images/bq-nav-menu.png)
    

You can use the navigation menu to open the following pages:

*   [**Overview**](#open-overview): lets you discover tutorials, features, and resources.
*   [**Studio**](#open-ui): lets you display your BigQuery resources and perform common tasks.
*   [**Search**](#search-page) ([Preview](https://cloud.google.com/products#product-launch-stages)): lets you search for Google Cloud resources from BigQuery by using natural language queries.
*   [**Agents**](#agents-page) ([Preview](https://cloud.google.com/products#product-launch-stages)): lets you create and chat with data agents that are designed to answer questions about BigQuery resources.

You can also use the navigation menu to perform specific tasks in the following menu sections:

*   **Pipelines and integration**: lets you create and configure [data transfers](/bigquery/docs/dts-introduction), create and list [Dataform](/bigquery/docs/orchestrate-workloads#dataform) repositories, and create and list [scheduled resources](/bigquery/docs/orchestrate-workloads) such as [scheduled queries](/bigquery/docs/scheduling-queries).
*   **Governance**: lets you display shared [data exchanges](/bigquery/docs/analytics-hub-manage-exchanges) and [cleanrooms](/bigquery/docs/data-clean-rooms), view [policy tags](/bigquery/docs/column-level-security), and [curate metadata](/bigquery/docs/automatic-discovery).
*   **Administration**: lets you perform administrative tasks such as [monitoring](/bigquery/docs/admin-resource-charts), viewing information about [jobs](/bigquery/docs/admin-jobs-explorer), [managing capacity](/bigquery/docs/reservations-intro), viewing information about [disaster recovery](/bigquery/docs/managed-disaster-recovery), and displaying [recommendations](/bigquery/docs/recommendations-intro).
*   **Migration**: lets you view and set up options for [migrating your data warehouse](/bigquery/docs/migration/migration-overview) to BigQuery.
*   **Partner Center**: provides tools and services from [partners](/bigquery/docs/bigquery-ready-overview#partner_center) to accelerate your workflow.
*   **Settings**: lets you customize your BigQuery user and administrator settings.
*   **Release notes**: contains the latest [product updates and announcements](/bigquery/docs/release-notes) for BigQuery.

## The BigQuery Studio page

The BigQuery [**Studio**](/bigquery/docs/query-overview#bigquery-studio) page displays your BigQuery resources and lets you perform common tasks. The Studio page has the following components:

![The components of BigQuery Studio.](https://docs.cloud.google.com/bigquery/images/bq-studio-ui.png)

1.  _**Explorer** tab of the left pane_: use the **Explorer** tab to work with tables, views, routines, and other BigQuery resources, and view your [job history](/bigquery/docs/managing-jobs#list_jobs_in_a_project).
    
    The left pane also contains an option to add data to BigQuery. When you click **Add data**, you can use search and filtering capabilities to find a data source that you want to work with. After you select a data source, you can do the following based on the capabilities available for your data source:
    
    *   **Set up BigQuery table over external data (_federation_)**: enables BigQuery to access external data without ingesting it into BigQuery. You can [create a table to access external data](/bigquery/docs/external-data-sources) or [create a connection to an external source](/bigquery/docs/connections-api-intro).
    *   **Load data to BigQuery**: lets you load data to BigQuery by setting up a [data transfer](/bigquery/docs/dts-introduction) or by using a [partner capability](/bigquery/docs/load-data-third-party). Loading data to BigQuery is recommended for optimal data processing at scale.
    *   **Change data capture to BigQuery**: replicates data from a data source to BigQuery by capturing and applying changes. You can use applications such as [datastream](/datastream/docs/overview) or [partner solutions](/bigquery/docs/load-data-third-party) to ingest data from a data source.
    *   **Stream data to BigQuery**: ingests data into BigQuery with low latency. You can use applications such as [Dataflow](/dataflow/docs/guides/write-to-bigquery), [Pub/Sub](/pubsub/docs/overview), or [partner solutions](/bigquery/docs/load-data-third-party) to ingest data from a data source.
    
    For more information about loading data into BigQuery, see [Introduction to loading data](/load-data/loading-data.md).
    
2.  _**Classic Explorer** tab of the left pane_: use the legacy version of the **Explorer** pane to view BigQuery resources.
    
3.  _**Files** tab of the left pane_ ([Preview](https://cloud.google.com/products/#product-launch-stages)): use the **Files** tab to organize code assets such as saved queries and notebooks by using folders. For more information, see [Organize code assets with folders](/bigquery/docs/code-asset-folders).
    
4.  _**Repository** tab of the left pane_ ([Preview](https://cloud.google.com/products/#product-launch-stages)): use the **Repository** tab to store code, edit files, and track changes using version control through repositories or by using remote Git-based repositories. For more information, see [Introduction to repositories](/bigquery/docs/repository-intro).
    
5.  _**Home** tab_: use the **Home** tab to view the following resources:
    
    *   The **Check out what's new in Studio** section that lists new features in BigQuery Studio. You can click **Try it** to view the features. If the section isn't visible, click **What's new in Studio** to expand the section.
    *   The **Create new** section that has options to create a new SQL query, notebook, Apache Spark notebook, data canvas, data preparation file, pipeline, or table.
    *   The **Recent** section where you can view your 10 most recently accessed resources. These resources include tables, saved queries, models, and routines.
    *   The **Try with templates** section that lets you use templates to get started querying data and working with notebooks.
    *   The **Add your own data** section that helps you get started loading data into BigQuery.
6.  _Query editor_: use the query editor to create and [run an interactive query](/bigquery/docs/running-queries#queries). You can also view the results in the **Query results** pane that opens after you run the query.
    

### Explore the Studio page

The **Studio** page BigQuery is the central point for viewing your BigQuery resources and for performing common tasks such as creating datasets and creating and running notebooks.

> [!NOTE]
> **Note:** To see how to use keyboard shortcuts in Studio, click **BigQuery Studio shortcuts** in the BigQuery Studio toolbar:

To explore the **Studio** page, follow these steps:

1.  In the Google Cloud console, go to the BigQuery **Studio** page.
    
    Alternatively, enter the following URL in your browser:
    
    ```
    https://console.cloud.google.com/bigquery
    ```
    
    The **Studio** page opens in your most recently accessed project.
    
2.  In the left pane, click the **Explorer** tab.
    
    The **Explorer** pane lists different code assets and data resources, and it lets you search for BigQuery resources.
    
    > [!NOTE]
    > **Note:** You can expand and collapse the left pane by clicking **Collapse left pane** or **Expand left pane**.
    
3.  Go to the `bigquery-public-data` project, click **Toggle node** to expand it, and then click **Datasets**. A new tab opens in the details pane that shows a list of all the datasets in the project.
    
    BigQuery [public datasets](/bigquery/public-data) are stored in BigQuery and made available to the general public through the Google Cloud Public Dataset Program.
    
4.  In the list, click the `austin_crime` dataset.
    
5.  On the **Overview** tab, view the resources stored in the dataset such as tables, models, and routines.
    
6.  Click the **Details** tab. This tab shows all details for the dataset including metadata information.
    
7.  To navigate different tabs and resources, use the breadcrumb trail as shown in the following example:
    
    ![Breadcrumbs in the details pane.](/static/bigquery/images/breadcrumbs-console.png)
    
8.  In the **Explorer** pane, click **Job history**. This opens the list of job histories in a new tab:
    
    ![Tabs for personal history and project history and saved queries.](/static/bigquery/images/web-ui-personal-and-project-history.png)
    
    Every time you load, export, query, or copy data, BigQuery automatically creates, schedules, and runs a job that tracks the progress of the task.
    
    1.  To view details of your own jobs, click **Personal history**.
        
    2.  To view details of recent jobs in your project, click **Project history**.
        
        > [!NOTE]
        > **Note:** To see the details of a job or to open a query from a query job, in the **Actions** column for a job or query, click **Actions** \> **Show job details** or **View job in editor**.
        
9.  In the left pane, click the folder\_data **Repository** tab ([Preview](https://cloud.google.com/products/#product-launch-stages)).
    
    You can use repositories to perform version control on files that you use in BigQuery. BigQuery uses Git to record changes and manage file versions.
    
    You can use workspaces within repositories to edit the code stored in the repository. When you click a [workspace](/bigquery/docs/workspaces) in the **Git repository** pane, it opens in a tab in the details pane.
    
10.  In the left pane, click **Files** ([Preview](https://cloud.google.com/products/#product-launch-stages)).
     
     The Files tab lets you create user and team folders that store and organize your code assets.
     
11.  Click the **Home** tab.
     
     The Home tab provides links and templates that let you get started using BigQuery.
     
     If you close the **Home** tab, you can open it by clicking **Home** in the **Explorer** tab.
     
12.  Click the query editor. This tab is labeled search\_insights **Untitled query**.
     
     You use the query editor to create SQL queries, run SQL queries, and view the results.
     
     If you close the query editor, you can open it by clicking the **Home** tab, and then in the **Create new** section, click **SQL query**.
     

### Work with tabs in Studio

Whenever you select a resource or click **SQL query** in the details pane, a new tab opens. If more than one tab is open, you can split the tabs into two panes and view them side by side.

#### Prevent tabs from being replaced

To reduce tab proliferation, clicking a resource opens it within the same tab. To open the resource in a separate tab follow these steps:

1.  Press Ctrl (or Command on macOS) and click the resource.
    
2.  Alternatively, double-click the tab name. The name changes from italicized to regular font.
    
3.  If you accidentally replace the current page, you can locate it by clicking tab\_recent **Recent tabs** in the details pane.
    

#### Split and unsplit tabs

To split tabs into two panes, follow these steps:

1.  Next to the tab name, click **Open menu**.
    
2.  Select one of the following options:
    
    *   To place the selected tab in the left pane, select **Split tab to left**.
        
    *   To place the selected tab in the right pane, select **Split tab to right**.
        
    
    > [!NOTE]
    > **Note:** If only one tab is open, these menu options are unavailable.
    
3.  To unsplit the tabs, select **Open menu** on one of the open tabs, and then select **Move tab to left pane** or **Move tab to right pane**.
    

#### Query data using split tabs

To split tabs when querying tables, follow these steps:

1.  In the **Explorer** menu, click the table that you want to query.
    
2.  Click **Query**, and then click **In new tab** or **In split tab**:
    
    ![Options to query a table in a new or split tab.](/static/bigquery/images/web-query-split.png)
    
3.  Click the field name that you want to query:
    
    ![Add the field name to the query in a split tab.](/static/bigquery/images/web-table-field-split-tab.png)
    

The following image shows the details pane with two open tabs. One tab has a SQL query, and the other tab shows details about a table.

![Details pane with two open tabs.](/static/bigquery/images/console-tabs.png)

#### Move tabs between panes

To move a tab from one pane to the other pane, follow these steps:

1.  Next to the tab name, click **Open menu**.
    
2.  Select **Move tab to right pane** or **Move tab to left pane** (whichever option is available).
    

#### Close all other tabs

To close all tabs except for one, follow these steps:

1.  Next to the tab name, click **Open menu**.
    
2.  Select **Close other tabs**.
    

## The Overview page

The BigQuery **Overview** page is your hub for discovering tutorials, features, and resources to help you get the most out of BigQuery. It provides guided paths for users of all skill levels, whether you are running your first query or exploring advanced AI/ML capabilities.

You can use the **Overview** page to find resources organized by your role or interest like data analysis or data science. These resources let you find the most relevant content to get started quickly.

### Explore the Overview page

1.  In the console, go to the **Overview** page.
    
    You can also open the BigQuery **Overview** page by entering the following URL in your browser:
    
    ```
    https://console.cloud.google.com/bigquery/overview
    ```
    
2.  Review the following sections of the **Overview** page:
    
    *   The **Introduction** section: gives you a quick video overview of BigQuery's capabilities.
        
    *   The **Get started** section: designed for learning by doing. Here you can launch interactive guides that help you learn how to use BigQuery features.
        
    *   The **Find out more** section: shows the BigQuery release notes so you can view the latest feature announcements and updates.
        
    *   The **Explore possibilities** section: provides in-depth tutorials and learning opportunities for specific features.
        

### Customize the Overview page

You can customize the **Overview** page to show or hide information relevant to your task or role.

1.  On the **Overview** page, go to the filter bar.
    
    ![The filter bar on the Overview page.](https://docs.cloud.google.com/bigquery/images/overview-filter.png)
    
2.  Click the option that best matches your current task or role:
    
    *   Data analysis
    *   Data science
    *   Data engineering
    *   Data administration
    
    Selecting a task dynamically changes the content in the **Introduction**, **Get started**, and **Explore Possibilities** sections to show the most relevant content.
    
3.  Optional: To tailor the content on the **Overview** page to your specific needs, hide individual cards:
    
    1.  In the card, click **More options**.
        
    2.  Choose **Hide card**. Your preferences for hidden cards are saved per user.
        
    3.  To unhide the card, at the end of the section, click **Show hidden content**.
        
4.  If an entire section is not relevant, click to collapse it. Your user preferences for collapsed sections are saved.
    

## The Search page

The [**Search**](/bigquery/docs/search-resources) page ([Preview](https://cloud.google.com/products#product-launch-stages)) lets you search for Google Cloud resources from BigQuery by using natural language queries.

For information about opting into using the **Search** page, see [Search for resources](/bigquery/docs/search-resources).

## The Agents page

The **Agents** page ([Preview](https://cloud.google.com/products#product-launch-stages)) is a central location for creating and chatting with data agents that are designed to answer questions about BigQuery resources.

Data agents contain table metadata and use case-specific query processing instructions that define the best way to answer user questions about a set of tables that you select. Users can have [conversations](/bigquery/docs/ca/create-conversations) with data agents to ask questions about BigQuery data using natural language. For more information, see [Create data agents](/bigquery/docs/create-data-agents).

For information on creating agents and using conversational analytics, see [Conversational analytics in BigQuery](/bigquery/docs/conversational-analytics).

## Limitations

The BigQuery Google Cloud console doesn't support [Virtual Private Cloud](/vpc-service-controls/docs/supported-products#console) or [Private Service Connect](/vpc/docs/private-service-connect).

## Troubleshoot BigQuery Google Cloud console issues

If you experience issues in the Google Cloud console when using BigQuery, such as pages not loading, slow responsiveness, or missing features, try the following troubleshooting steps.

### Common browser fixes

Many Google Cloud console issues are caused by local browser configurations or cached data.

*   **Browser troubleshooting:** for general browser troubleshooting steps such as using Incognito mode, clearing cache and cookies, or turning off browser extensions, see [Troubleshoot Google Cloud console page loading issues](/support/docs/troubleshoot-console-page-loading).
*   **Verify service health:** check the [Google Cloud **Service Health** dashboard](https://status.cloud.google.com/) for ongoing BigQuery service outages.

### Connectivity and firewall requirements

If you are working behind a corporate VPN or proxy, it might block API calls required by the console. Ensure your network administrator allowlists the following domains:

*   `https://cloudconsole-pa.clients6.google.com`
*   `https://clients6.google.com`
*   `https://cloudusersettings-pa.clients6.google.com`

Common symptoms of blocked API endpoints include a spinning progress indicator for autocomplete suggestions or permission errors despite having the correct IAM roles.

### Improve performance for large projects

If your project contains a large number of datasets or tables, the **Explorer** tab can load slowly.

*   **Use the minimal loading parameter:** you can prevent the resource tree from pre-loading by appending `?minimal=true` to your URL. For example:
    
    `https://console.cloud.google.com/bigquery?minimal=true&project=PROJECT_ID`
    
*   **Unpin unused projects:** remove pinned projects that you are not actively using to reduce the load on the **Explorer** tab.
    
*   **Force metadata refresh:** if you modified tables through the API/CLI and changes don't show in the console, perform a hard refresh (Ctrl+Shift+R or Cmd+Shift+R). Use `INFORMATION_SCHEMA` queries as a definitive source of truth.
    

### Troubleshoot maps and charts

*   **Geospatial (TinyMap):** the geospatial visualization tab is available only if your query results contain a `GEOGRAPHY` column. Map visualization is limited to a maximum of 20,000 features or 1 million vertices.
*   **Charts:** results must contain at least one numeric column to generate charts. If a "No data to display" warning appears, check for null values in the selected X-axis dimension.

### Troubleshoot data lineage and profiling

*   **Lineage delay:** data lineage information isn't real-time. Allow up to 30 minutes for lineage data to synchronize.
*   **Required APIs:** ensure the Dataplex API (`dataplex.googleapis.com`) and Data Catalog API (`datacatalog.googleapis.com`) are enabled in your project.

### Troubleshoot BigQuery Studio and saved queries

*   **Saved query migration limit:** if you have more than 2,500 saved queries, the automated migration tool cannot process them. Contact [Cloud Customer Care](https://cloud.google.com/support) to request a manual migration.
*   **Required APIs:** saving scripts and notebooks in BigQuery Studio requires the Dataform API (`dataform.googleapis.com`) to be enabled in your project.

### Contact support

If the issue persists, collect the following information before creating a support ticket:

1.  **A HAR file:** record the network request log while reproducing the issue (using the browser's developer tools Network tab with **Preserve Log** checked).
2.  **Console logs:** capture JavaScript errors shown in the browser's developer console (Ctrl+Shift+I > Console).
3.  **Project ID:** the ID of the project you are working in.
4.  **Tracking number:** the tracking ID shown in any error banners.

## What's next

*   To learn about querying a public dataset and using the BigQuery sandbox, see [Try BigQuery using the sandbox](/bigquery/docs/sandbox).
*   To learn how to load and query data in the Google Cloud console, see [Load and query data](/load-data/load-data-console.md).

---

[^src-explore-bigquery-in-]: [Explore BigQuery in the Google Cloud console](https://docs.cloud.google.com/bigquery/docs/bigquery-web-ui) - Google Cloud Documentation
