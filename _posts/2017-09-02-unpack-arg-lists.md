---
layout: post
title: Unpacking Argument Lists
image: https://stubs.github.io/public/unpack_arg_lists/excerpt_photo.png
excerpt: Recent real life example of having to utilize the "Splat" operator to work with variable length lists that are to be input to methods that require separate positional arguments.
---

I was recently working on a python wrapper around grep.  I often find myself having to search for random patterns through tons of CSVs.  At work I have used some applications that have definitely helped out, but inevitably I find that said applications are lacking in some way or another.  Maybe it’s that the application does not easily allow (or possibly does not allow at all) any kind of recursive searching, does not allow ways to specify certain directories to not even bother searching, or godforbid it does allow any kind of regular expressions.  I thought it’d be fun to try to whip up a little script that could meet my needs….fun & practical.  The code is available on my [GitHub](http://www.github.com/stubs/py_grep_parse). (Although it may have changed some from the time of this writing).


In a nutshell, the python script utilizes the [Subprocess](https://docs.python.org/2/library/subprocess.html) module to make a call to grep to look for a given regular expression.  In the example below I simply was looking for the pattern “smith” (case insensitive) in a directory appropriately named “test_data”.
![code0]({{site.url}}/public/unpack_arg_lists/photo0.png){: .center-image }


The results are below:
![code1]({{site.url}}/public/unpack_arg_lists/photo1.png){: .center-image }


“Great!”, I thought.  Now I can make a `head` call to gather the given file’s column headers.  Seems simple enough. In this case, my test data was all in one directory (which was my first mistake) appropriately name “/test_data”, so I did not think much of how to accomplish this task.


Before I can make the `head -1` call to gather the first row of a file, I need to first parse the path to the file from the data yielded in the first column (as shown above). Lastly, I can pass the individual variables client & file_name to the `os.path.join()` method to get a intelligently joined path. :
![code2]({{site.url}}/public/unpack_arg_lists/photo2.png){: .center-image }


### COMPLICATING STUFF
Well what if your grep search finds hits at different depths of recursion?  For instance, what if the directory containing all the data I wished to grep looked something like this:
![code3]({{site.url}}/public/unpack_arg_lists/photo3.png){: .center-image }


Unfortunately, `os.path.join()` is a function call requiring separate positional arguments.  This means one cannot simply create a list of all the different directories that construct the path to work with and pass that into `os.path.join()`.
![code4]({{site.url}}/public/unpack_arg_lists/photo4.png){: .center-image }


This puzzled me for a while, but rather than immediately try to start coding a solution I made myself take a quick break and grab a coffee.  I had a feeling I had stumbled across something similar when I was reading through every Python text book I could find (back when I was reading a lot more than actually writing).


Sure enough I remembered reading about how to denote functions that could be called with arbitrary arguments lists using the “*” character. The same character can also unpack arguments that are already in a list or tuple to be used for a function call that needs separate arguments….like `os.path.join()`!
![code5]({{site.url}}/public/unpack_arg_lists/photo5.png){: .center-image }


Utilizing the almighty * I was able to easily grep files for a regex pattern & pull header rows for any files that were reported as having matches by my previous grep call with one python script.
![code6]({{site.url}}/public/unpack_arg_lists/photo6.png){: .center-image }


### Related Links:
* [Python Documentation](https://docs.python.org/2.7/tutorial/controlflow.html#unpacking-argument-lists)
