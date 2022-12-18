---
layout: post
title: Git Hooks.  Use them please.
excerpt: Git hooks are a simple way of helping to reduce pesky unwanted errors from polluting your commit history........or worse accidentally kicking off some CI/CD process you aren't ready for.
---

I like to think that i'm fully aware of the state of the code that I am working on at any
given moment, but I have, on occasion, found that I have missed some random `TODO` comments.
This usually isn't too big of a deal, but I recently found myself working on a repo where the
presence of a particular string could kick off a downstream CI/CD process via Github Actions.
Unfortunately this very thing had occured more than once.

To illustrate, in this repo there were a number of YAML configuration files that contained key value pairs that would dictate
the deployment of code into either a dev or prod environment........or both.

```yaml
datasource: example_1
build_deploy_dev: true
build_deploy_prod: false
```

At times i'd find that some one had toggled a deploy key to `true`, but then had forgotten to toggle
it to `false`. A little annoying, but hey. These things happen. A quick and easy solution was just to
`grep` all these YAML files for pattern `true` prior to any `git push`. I quickly decided to automate
the checking for this string with a pre-push Git hook. For the uninitiated, a [Git hook](https://git-scm.com/docs/githooks)
is simply a shell script that runs before or after a particular git action.

```bash
if [[ "$(git rev-parse --show-toplevel | xargs -0 basename)" =~ (repo_1|repo_2) ]];
then
    # no more stray build_deploys
    if grep -Erq "build_deploy_(prod|dev|qa): true" "$(git rev-parse --show-toplevel)";
    then
        echo
        echo "The following conf.yml files still have some 'true' values. Is this expected?"
        echo
        echo "$(grep -Er "build_deploy_(prod|dev|qa): true" "$(git rev-parse --show-toplevel)")"

        exec < /dev/tty
        select yn in "Yes" "No"; do
            case $yn in
                "Yes" ) break;;
                "No" ) exit 1;;
            esac
        done
    fi
fi
```

My `pre-push` git hook will only run if I am in one of the two repos that have these YAML config files (e.g. "repo_1" or "repo_2").
If grep has any pattern matches for "build_deploy_(prod|dev|qa): true" in any config YAML files my git push
will be interrupted and the script will alert the user via the some echoed messages to stdout. My personal
favorite touch is the `case` statement that cancels out the entire git push if there actually is something that should not be set to `true`!

The beauty of git hooks is that you can basically toss in any shell script you want into them! The important
thing to get out of this is that git will handle the automatic checking for you! Use that to you and your team's
advantage to stop any unwanted tech debt or other undesireables from making their way into your repos. Lastly,
you can have git look for these hooks in whatever directory you'd like by updating your git config.

![set_hooks_path]({{site.url}}/public/githooks/set_hooks_path.png){: .center-image }
