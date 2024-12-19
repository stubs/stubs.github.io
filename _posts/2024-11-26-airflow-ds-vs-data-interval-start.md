---
layout: post
title: Apache Airflow Template Variables and Dataset scheduled DAGs.
excerpt: Quick notes about migrating Airflow DAGs from cron expression schedules to Dataset schedules.
---


When it comes to orchestrating data pipelines, Apache Airflow has always been a tried and true option.
Scheduling Airflow DAGs via a cron expression has been a feature since the beginning, but with the release of version 2.4 [Datasets](https://airflow.apache.org/docs/apache-airflow/stable/authoring-and-scheduling/datasets.html#) have introduced the option for more of an event-driven architecture.
In the field of data engineering, it is not uncommon to find Airflow orchestrating various parts of ELT||ETL pipelines.
Adopting the use of datasets can help to create more dynamic workflows that are triggered as soon as possible, but migrating existing DAGs can, at times, be trickier than it may seem.
As is often the case, _it depends_ 😈.

# The Problem
I've recently seen a few instances of eager engineers jumping at the chances to modernize some existing DAGs that had historically been scheduled via cron expressions.
Often, I have seen DAGs historically running at multiple times a day.
Not because that DAG required it, but because these multiple schedules throughout the day were a sort of proxy that represented an assumption for when some underlying source data was ready to be transformed further downstream.
Choosing these cron expressions can run the gamut of being complete guesswork or at best some esoteric hueristics.
If you are lucky, you may have some concrete guarantee that said source data is ready by a specific time.
Regardless, the end goal here is to deliver data to end users when underlying data sources are ready, as opposed to when someone might _think_ they are ready.
Unfortunately, this can require more than simply updating the DAG's `schedule` param.
Let's dive into a simplified, yet realistic example to demonstrate.

In the snippet below, we have two DAGs defined.  They are identical except that `Dag_1` is scheduled via a [CronTriggerTimetable](https://airflow.apache.org/docs/apache-airflow/stable/authoring-and-scheduling/timetable.html#crontriggertimetable) and `Dag_2` is scheduled via a Dataset update to the `Dataset("trigger_Dag_2")` object.
For the sake of brevity, I have each of these two DAGs simply performing the same task `print_template_vars`. Let's examine this task's log from `Dag_1` and `Dag_2`.


```python
from datetime import timedelta
from airflow.datasets import Dataset
from airflow.decorators import task
from airflow.models import DAG
from airflow.timetables.trigger import CronTriggerTimetable
import pendulum


@task
def print_template_vars(
    outlet: Dataset | None = None,
    data_interval_start=None,
    ds=None,
    ds_nodash=None,
    logical_date=None
) -> Dataset | None:
    print(f"data_interval_start value = {data_interval_start}")
    print(f"ds value = {ds}")
    print(f"ds_nodash value = {ds_nodash}")
    print(f"logical_date value = {logical_date}")
    return outlet


with DAG(
    dag_id="Dag_1",
    schedule=CronTriggerTimetable(
        cron="*/5 * * * *",
        interval=timedelta(days=1),
        timezone="UTC"
    ),
    default_args=dict(
        start_date=pendulum.datetime(2024, 11, 1),
    ),
    max_active_runs=1,
    catchup=False,
    is_paused_upon_creation=True,
) as dag:

    print_template_vars(outlet=Dataset("trigger_Dag_2"))


with DAG(
    dag_id="Dag_2",
    schedule=[Dataset("trigger_Dag_2")],
    default_args=dict(
        start_date=pendulum.datetime(2024, 11, 1),
    ),
    max_active_runs=1,
    catchup=False,
    is_paused_upon_creation=True,
) as dag:

    print_template_vars()
```

## Dag_1
![Dag 1 Scheduled]({{site.url}}/public/airflow-template-vars/dag_1_print_template_vars_log.jpg){: .center-image }

The airflow logs clearly show that a number of Airflow's [templated variables](https://airflow.apache.org/docs/apache-airflow/stable/templates-ref.html#variables) differ between the two DAGs.
Let's start with `Dag_1`.
Once unpaused, `Dag_1` is scheduled to run every 5 minutes.
For every one of those Dag Runs the data interval start to be processed is 1 day back from the data interval end (aka the time the dag was triggered).
In this example we can see that the template variables `logical_date`, `ds`, and `ds_nodash` all share different formats of the `data_interval_start`.
This is typical for [DagRunTypes](https://github.com/apache/airflow/blob/2d53c1089f78d8d1416f51af60e1e0354781c661/airflow/utils/types.py#L51-L54) of `scheduled`.

This behavior is not consistent for manual triggering of any DAG that is scheduled with a cron expression.
For example, we can see below that a manual trigger of `Dag_1` logs template variables `logical_date`, `ds`, and `ds_nodash` that have values representing the time the DAG run was began.

![Dag 1 Manual]({{site.url}}/public/airflow-template-vars/dag_1_print_template_vars_log_manual.jpg){: .center-image }

## Dag_2
Moving on to `Dag_2`.
Here we can see behavior identical to what we just saw with a manual run type of `Dag_1`.

![Dag 2]({{site.url}}/public/airflow-template-vars/dag_2_print_template_vars_log.jpg){: .center-image }

# TLDR
Dataset triggered DAG runs do not follow the same pattern as scheduled DAG runs when it comes to a DAG run's `logical_date` and any templated variables that are derived from `logical_date`.
In fact, Dataset scheduled DAGs behave much closer to manually triggered cron expression DAGs in this regard.
When refactoring existing Airflow DAGs or tasks to use Dataset schedules be mindful of what template variables are being used in your operator's logic!
