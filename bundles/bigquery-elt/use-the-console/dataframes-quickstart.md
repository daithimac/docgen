---
type: Guide
title: Try BigQuery DataFrames
description: >-
  Use this quickstart to perform the following analysis and machine learning (ML) tasks by using the
  BigQuery DataFrames API in a BigQuery notebook:.
resource: https://docs.cloud.google.com/bigquery/docs/dataframes-quickstart
tags:
  - bigquery
  - home
  - documentation
  - data-analytics
  - guides
status: stable
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

# Try BigQuery DataFrames

> [!TIP]
> This guide includes a sanctioned executable computation: [Try BigQuery DataFrames Computation](/computations/comp-try-bigquery-dataframes.md)

# Try BigQuery DataFrames

Use this quickstart to perform the following analysis and machine learning (ML) tasks by using the [BigQuery DataFrames API](https://dataframes.bigquery.dev/reference/index.html) in a [BigQuery notebook](/bigquery/docs/notebooks-introduction):

*   Create a DataFrame over the `bigquery-public-data.ml_datasets.penguins` public dataset.
*   Calculate the average body mass of a penguin.
*   Create a [linear regression model](https://dataframes.bigquery.dev/reference/api/bigframes.ml.linear_model.LinearRegression.html).
*   Create a DataFrame over a subset of the penguin data to use as training data.
*   Clean up the training data.
*   Set the model parameters.
*   [Fit](https://dataframes.bigquery.dev/reference/api/bigframes.ml.linear_model.LinearRegression.fit.html) the model.
*   [Score](https://dataframes.bigquery.dev/reference/api/bigframes.ml.linear_model.LinearRegression.score.html) the model.

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
    

2.  [Verify that billing is enabled for your Google Cloud project](/billing/docs/how-to/verify-billing-enabled#confirm_billing_is_enabled_on_a_project).
    

4.  Verify that the BigQuery API is enabled.
    
    If you created a new project, the BigQuery API is automatically enabled.
    

### Required permissions

To create and run notebooks, you need the following Identity and Access Management (IAM) roles:

*   [BigQuery User (`roles/bigquery.user`)](/bigquery/docs/access-control#bigquery.user)
*   [Notebook Runtime User (`roles/aiplatform.notebookRuntimeUser`)](/vertex-ai/docs/general/access-control#aiplatform.notebookRuntimeUser)
*   [Code Creator (`roles/dataform.codeCreator`)](/dataform/docs/access-control#dataform.codeCreator)

## Create a notebook

Follow the instructions in [Create a notebook from the BigQuery editor](/bigquery/docs/create-notebooks#create-notebook-console) to create a new notebook.

## Try BigQuery DataFrames

Try BigQuery DataFrames by following these steps:

1.  Create a new code cell in the notebook.
2.  Add the following code to the code cell:
    
    ```sql
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
    
3.  Modify the `bpd.options.bigquery.project = your_gcp_project_id` line to specify your Google Cloud project ID. For example, `bpd.options.bigquery.project = "myProjectID"`.
    
4.  Run the code cell.
    
    The code returns a `DataFrame` object with data about penguins.
    
5.  Create a new code cell in the notebook and add the following code:
    
    ```python
    # Use the DataFrame just as you would a pandas DataFrame, but calculations
    # happen in the BigQuery query engine instead of the local system.
    average_body_mass = df["body_mass_g"].mean()
    print(f"average_body_mass: {average_body_mass}")
    ```
    
6.  Run the code cell.
    
    The code calculates the average body mass of the penguins and prints it to the Google Cloud console.
    
7.  Create a new code cell in the notebook and add the following code:
    
    ```sql
    # Create the Linear Regression model
    from bigframes.ml.linear_model import LinearRegression
    
    # Filter down to the data we want to analyze
    adelie_data = df[df.species == "Adelie Penguin (Pygoscelis adeliae)"]
    
    # Drop the columns we don't care about
    adelie_data = adelie_data.drop(columns=["species"])
    
    # Drop rows with nulls to get our training data
    training_data = adelie_data.dropna()
    
    # Pick feature columns and label column
    X = training_data[
        [
            "island",
            "culmen_length_mm",
            "culmen_depth_mm",
            "flipper_length_mm",
            "sex",
        ]
    ]
    y = training_data[["body_mass_g"]]
    
    model = LinearRegression(fit_intercept=False)
    model.fit(X, y)
    model.score(X, y)
    ```
    
8.  Run the code cell.
    
    The code returns the model's evaluation metrics.
    

## Clean up

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

*   Continue learning about [BigQuery DataFrames](/bigquery/docs/bigquery-dataframes-introduction).
*   Learn how to [visualize graphs using BigQuery DataFrames](/bigquery/docs/dataframes-visualizations).
*   Learn how to [use a BigQuery DataFrames notebook](https://github.com/googleapis/python-bigquery-dataframes/tree/main/notebooks/getting_started/getting_started_bq_dataframes.ipynb).

---

[^src-try-bigquery-datafra]: [Try BigQuery DataFrames](https://docs.cloud.google.com/bigquery/docs/dataframes-quickstart) - Google Cloud Documentation
