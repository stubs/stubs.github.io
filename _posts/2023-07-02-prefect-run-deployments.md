---
layout: post
title: The Orchestrator Pattern in Prefect deployments.
excerpt: Let's take a quick look at how to have a Prefect flow trigger a downstream deployment.
---

Before we get too into the weeds here, let's go over some basics.

## What are Prefect flows?
"Flows" in Prefect speak are just an object that encapsulates logic related to the tasks you are attempting to perform.  They are represented in Python as a single function.


## ...and Prefect Deployments?
From Prefect's [documentation](https://docs.prefect.io/2.10.18/concepts/deployments/#deployments)
> A deployment is a server-side concept that encapsulates a flow, allowing it to be scheduled and triggered via API.


## Scheduling Deployments: CronSchedules, ad-hoc, or triggered from other flows.
Personally, I have been pretty pleased with using a monorepo for all my Prefect related deployments. For this post let's imagine a few data source specific dirs that would handle the Extract & Load (["E & L"](https://www.linkedin.com/pulse/eletl-elt-data-engineering-concepts-your-next-sayan-chowdhury/)), and one larger dbt dir that housed dbt models that relied on raw data sources delivered by the E & L deployments.

------
```
./
├── ints/
│  ├── dbt/
│  │  ├── flows/
│  │  │  ├── models/
│  │  │  │  └── dummyjson/
│  │  │  │     ├── staging/
│  │  │  │     │  └── stage_dummyjson__products.sql
│  │  │  │     └── __sources.yaml
│  │  │  ├── dbt.py
│  │  │  └── dbt_project.yml
│  │  └── deployments.py
│  └── dummyjson_products/
│     ├── flows/
│     │  └── api.py
│     └── deployments.py
├── .gitignore
├── poetry.lock
├── pyproject.toml
└── readme.md
```
------

Up until recently I had launched my deployments using [Cron Schedules](https://docs.prefect.io/2.10.18/concepts/schedules/#cron). Essentially I would make sure that I scheduled a dependency flow first, and then at some time later (e.g. maybe an hour later or whatever) I would schedule any downstream deployments.
For example, here are two different Prefect flows that are logically related.  The [first flow](https://github.com/stubs/prefect-explorations/blob/main/ints/dummyjson_products/flows/api.py) contains an `export` function that hits an api and downloads raw JSON to a local flat file.

------
```python
import json
import requests

from prefect import flow, task
from prefect.deployments import run_deployment



@flow
def export():
    resp = requests.get("https://dummyjson.com/products")
    resp.raise_for_status()
    list_of_prods = resp.json()["products"]

    with open("/tmp/data.json", "w") as fout:
        for row in list_of_prods:
            fout.write(json.dumps(row) + "\n")
```
------

The [second flow](https://github.com/stubs/prefect-explorations/blob/main/ints/dbt/flows/dbt.py) simply uses some Prefect extensions to programmatically create a `dbt run` command.

------
```python
from prefect import flow
from prefect_dbt.cli.commands import trigger_dbt_cli_command


@flow
def dbt_command_flow(sub_cmd: str, models: str):

    """
    programmatic manner of constructing this dbt cli command:
    dbt run --profiles-dir profiles/ --select <MODEL_NAME>
    """

    dbt_command_dict = {
        "command": f"dbt {sub_cmd} --select {models}",
        "profiles_dir": "~/.dbt/",
        "project_dir": "./flows/"
    }

    result = trigger_dbt_cli_command(**dbt_command_dict)

    return result
```
------


In simple terms, the downloaded JSON from `api.py` is what the dbt model [stage_dummyjson__products](https://github.com/stubs/prefect-explorations/blob/main/ints/dbt/flows/models/dummyjson/staging/stage_dummyjson__products.sql)
depends on (this can be explicitly seen in the [dbt sources](https://github.com/stubs/prefect-explorations/blob/main/ints/dbt/flows/models/dummyjson/__sources.yaml) config yaml). One directly feeds into the other.


------
```yaml
version: 2

sources:
  - name: external_sources
    meta:
      external_location: "/tmp/data.json"
    tables:
      - name: raw_products
```
------


Returning back to my previous point of using Cron schedules for my deployments, often I would end up with a `deployments.py` file in each Prefect project sub-directory. For these two previous examples, I would have the dummyjson_product deployment scheduled first at some arbitrary time. I would then have to create a dbt deployment for the dbt models that transform the raw source data in a separate `deployments.py` file.


First here in [ints/dummyjson_products/deployments.py](https://github.com/stubs/prefect-explorations/blob/7175c541c87e521850711e1a887b81915565856d/ints/dummyjson_products/deployments.py#L25-L31):
```python
dummyjson_products_dep = deploy_factory(
    name="dummyjson_products",
    flow=export,
    param={},
    cron="0 0 * * *",
)
dummyjson_products_dep.apply(work_queue_concurrency=WORK_QUEUE_CONCURRENCY)
```

Second here in [ints/dbt/deployments.py](https://github.com/stubs/prefect-explorations/blob/7175c541c87e521850711e1a887b81915565856d/ints/dbt/deployments.py#L25-L31)
```python
dbt_downstream_model = deploy_factory(
    name="dbt_downstream_model",
    flow=dbt_command_flow,
    param={"sub_cmd": "run", "models": "stage_dummyjson__products"},
    cron="5 0 * * *",
)
dbt_downstream_model.apply(work_queue_concurrency=WORK_QUEUE_CONCURRENCY)
```


This doesn't scale.  After a while things get a little too
annoying trying to figure out how to squeeze in new deployments at different cron schedules.

Luckily, starting with v2.5.0, Prefect introduced [run_deployment](https://docs.prefect.io/2.10.18/api-ref/prefect/deployments/deployments/#prefect.deployments.deployments.run_deployment). This surfaces an easy way of having one deployment trigger another! No more having to hop between different `deplyoments.py` files to line up related deployments.

## Prefect's `run_deployment`
We can now worry about creating a Cron schedule for only the deployments responsible for our E & L work. Any downstream deployments can be lauched by the initial deployment. All we need to modify is our [first flow](https://github.com/stubs/prefect-explorations/blob/main/ints/dummyjson_products/flows/api.py). Simply tack on a `run_deployment` call after the important parts of our E & L flows. Don't forget to set timeout to 0! The `timeout` parameter allows you to control how long to wait for the downstream deployment to complete.  Setting this to 0 allows you to just _launch and leave_!

```python
import json
import requests

from prefect import flow, task
from prefect.deployments import run_deployment



@flow
def export():
    resp = requests.get("https://dummyjson.com/products")
    resp.raise_for_status()
    list_of_prods = resp.json()["products"]

    with open("/tmp/data.json", "w") as fout:
        for row in list_of_prods:
            fout.write(json.dumps(row) + "\n")

    # BOOM!
    run_deployment(name="dbt-command-flow/dbt_downstream_model", timeout=0)
    # BOOM!
```

|![Prefect UI]({{site.url}}/public/run_deployment/run_dep_prefect_gui.png){: .center-image }|
|:--:|
| <b>Our main `dummyjson_products` deployment now launches the downstream `dbt_downstream_model` as a "Subflow".</b>|


## Extra Resources:
* [Github repo for this posts' sample code](https://github.com/stubs/prefect-explorations)
