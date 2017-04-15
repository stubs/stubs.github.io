---
layout: post
title: Virtualenv with Python
excerpt: On creating isolated python environments 
---

I was a late comer to the the whole virtual environment thing with Python, and 
to be completely honest I have yet to come across any of the potential issues 
that I see cited by everyone as reasons to use them. This being said, I have still developed some 
personal reasons why I like to use them, some of these _may or may not be because I am lazy
as all hell_....but that is neither here nor there.  Lets jump into virtualenv.

## What?
I am more than aware that many of y'all probably already know what the package does,
but for those who are still new to the game and are still exploring the wealth of 
information online about Python, [virutalenv](https://pypi.python.org/pypi/virtualenv)
is a python module that lets you create isolated python environments for whatever 
project you want to work on. I might be misguided in my thinking, but I like to 
think it offers a clean slate for each and every different project you are going to
begin work on.

## Why?
This was one of those questions that I asked myself when I first heard about virtualenv. 
When I first started working in Python I was pretty pip-crazy. I kinda loved to just exlpore all the libraries 
and see what was available. Unfortunately this left my "pip list" output longer 
than I wanted. Sure, I could just go ahead and remove the stuff I didn't use, 
but who wants to do that. I like the idea of having the packages around for when I want to work 
on said code, but being out of sight when I don't need to think about them. 
Virtualenv helps with this. Now I simply create a new virtual environment for the 
new python program that I want to work on and pip install any additional package
dependencies. Any of these additional packages that you install will ONLY be 
available in the virtualenv you install them to.

## How?
### Installing virtualenv
Assuming you already have `pip` installed, are going to want to install virtualenv globally.

```bash
pip install virtualenv
```

### Creating a virtualenv
Next, simply cd into the directory you are going to work in. In my example I am going to 
go all _Inception_ and create a virtualenv inside my project directory named.... "vrtlenv". 

```bash
$ cd ~/dev/vrtlenv
$ virtualenv env
New python executable in ~/dev/vrtlenv/env/bin/python2.7
Also creating executable in ~/dev/vrtlenv/env/bin/python
Installing setuptools, pip, wheel...done.
```

The `virtualenv env` bit is creating a virtual environment to a directory named "env". It is 
not required that you name it "env", but it is convention. Also, I would like others looking at 
a project I have started to have to do as little as possible to continue to work. Moving on, to actually 
step into the new virtual environment you need to *activate* it.

```bash
$ source env/bin/activate
```

You'll be able to tell that you are in said virtual environment because there will
now be `(env)` pre-pended to the start of your command line prompt (if you chose
to go with a name other than "env" it will show up instead of "env").

As an additional sanity check you can `pip list` once the virtualenv is activated.
If you had any pip packages installed gloablly you should not see them in the pip
list output from within this virtual environment....because this is an isolated work
environment! Now you can pip install any packages/modules you need for your new python
program and it there will be no worries about whether or not they will cause any kind
of issues with other global packages.

Once you are done working do not forget to `deactivate` the virtualenv. Like before
you'll be able to tell that you have successfully returned to the global environment
by noticing the lack of the `(env)` at the start of your command line prompt. Any time 
you ever need to do more work on your project just remember to activate your virtualenv 
by calling `$ source env/bin/activate` from inside the project's directory!

---

While I have never actually ran into these depencency issues, I got sick of 
removing a ton of stuff from my `pip freeze > requirements.txt` output when I was trying to share 
some work with others. ~Lazy, I know.~ I don't know about y'all, but 
I would rather invest some time to setup these isolated virtual environments 
just to save myself the hassle of having to avoid cleaning up my requirements.txt file.

## Extra
* Jaime Matthews does a great job [explaining it](https://www.dabapps.com/blog/introduction-to-pip-and-virtualenv-python/) better than I did.
* [The Hitchhiker's Guide to Python on virtualenvs](http://docs.python-guide.org/en/latest/dev/virtualenvs/) 
