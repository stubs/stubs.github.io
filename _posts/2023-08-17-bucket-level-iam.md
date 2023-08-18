---
layout: post
title: "Adventures in Least Privilege: Securely Granting Cloud Storage Read Permissions."
excerpt: Explore the efficiency of granting bucket-level read permissions over project-level access in cloud storage security. Simplify access control today.
---

I've been working in the Data Engineering space for quite some time now. Invariably, I often come across some pieces of legacy code that
make me scratch my head in confusion 😕.  These types of discoveries are not rare, and, to be honest, other than being a poorly 
documented eye-sore of a function or class method, they tend to be benign. What can definitely be much worse is taking a look 
under the hood of your organization's Cloud provider IAM (Identity and Access Management) roles. Often, I get the feeling that some initial 
configuration may have been done _quick and dirty_ just to get the ball rolling on standing up some infrastructure in the cloud. Then, as usual,
people get sidetracked and often forget to come back and remedy some of the security concerns created by initially doing something like granting 
a user any kind of `* Admin` user.  This type of situation, in & of itself, is a big reason why I like to always codify any kind of resource configuration in 
an [Infrastructure as Code](https://www.redhat.com/en/topics/automation/what-is-infrastructure-as-code-iac#benefits-of-iac) tool, like 
[Terraform](https://www.terraform.io/use-cases/infrastructure-as-code). More on that in the future!


For this post, we'll just focus on how these roles are "attached" to cloud storage resources in Google Cloud Project.

## Prerequisites 

In GCP there are some "Predefined" IAM roles that easily be leveraged to give users object read permissions. 
One of the most basic of these roles is the [Storage Object Viewer](https://cloud.google.com/iam/docs/understanding-roles#storage.objectViewer).  


|![GCP's Storage Object Viewer]({{site.url}}/public/bucket_level_iam/gcp_storage_object_viewer.png){: .center-image }|


Any user who is assigned this role _may be able to "get" (aka download) any file you have stored in a Google storage bucket_. If 
you are working on a small team with loose security, or, perhaps, you are not working with any objects that are subject to some form
of data governance, then having a user with this role getting blanket `get` permissions might not be a big deal.  Lucky you! You can stop 
reading now. 😁 For everyone else still with us, you may be in a situation where you want to be a little bit more specific about what objects you want
to grant access to. I've found myself in this scenario plenty of times. Let's take a look at how to give a user access to a specific bucket 
(as opposed to all buckets in a GCP project). 


### Demo time
1) Our service account user with Project level IAM roles.


|![Our example user for today]({{site.url}}/public/bucket_level_iam/gcp_user.png){: .center-image }|


As you can see, this user has been granted the `Storage Object Viewer` role on the project level.  If your goal was to allow this user to be able to `get` or read objects you 
have stored in Google Cloud Storage, well, mission accomplished. I took the liberty of creating two GCS buckets to demonstrate this user's `get` permissions: `look_here_please`
and `dont_look_here_though`. In our scenario, we are going to want the user to be able to read objects from the bucket titled `look_here_please` only. In the screenshot below I impersonate this service account user and use its IAM role to `gsutil cat` the contents of the object at `gs://look_here_please/file.txt`.....
but as you can also see I am able to `cat` an object in the `dont_look_here_though` bucket.  Seems we may have given this user more read permissions than we wanted. What if there was
some sensitive data that this user should not have been able to see in the `dont_look_here_though` bucket?! 😱


|![Too much!]({{site.url}}/public/bucket_level_iam/gsutil_cat_1.png){: .center-image }|


2) Granting this role at the GCS bucket level. 

Don't worry! This can be fixed, and, what's even better, it's a pretty easy fix. The Storage Object Viewer IAM role just needs to be applied at the bucket level.
That is to say, the user should not have this role at the Project level because that can grant them the ability to view all objects in ANY project bucket.
In order to scope a user's `get` permission to a specific bucket you need to instead configure that specific bucket's permissions. There is more than 1 way of doing this, but 
the screenshot below just showcases the manual approach by using the cloud console to add the service account user to the bucket and assigning said user the necessary
Storage Object Viewer role.


|![Much better.]({{site.url}}/public/bucket_level_iam/bucket_level_role.png){: .center-image }|


3) Testing the user's lack of access.


|![DENIED! 🙅🏻‍♂️]({{site.url}}/public/bucket_level_iam/gsutil_cat_2.png){: .center-image }|


With this example, we focused on the application of the principle of least privilege to cloud storage services, but this lesson could (and should) be applied just as easily 
to any other cloud configuring one needs to do. The principle of least privilege in cloud IAM roles is crucial for security. It ensures that users and processes have only the minimum necessary permissions to perform their tasks, limiting potential damage from accidental or malicious actions. This practice enhances data protection and minimizes the attack surface, bolstering overall cloud security.