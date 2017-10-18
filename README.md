## AWS Buddy: A Build Manager backed by an S3 bucket


### What's AWS Buddy?

AWS Buddy is a command line tool that helps you use an S3 bucket as a simple build manager.


### Usage

```sh
# install it (globally)
$ npm install aws-buddy -g

# use it (generates default config on first use)
$ buddy --help

# config it (you'll need to make some edits before this will work for you)
$ vi ~/.aws-buddy.json
```

### Typical Workflow and S3 Directory Structure
```
build
    archive
    env
        dev
        stage
        prod
```
 1. ``buddy push`` download remote build and upload it to **dev**.
 1. ``buddy info`` display the status of all environments.
 1. ``buddy promote --env dev`` copy build from **dev** to **stage**.
 1. ``buddy promote --env stage --ver 1.2.0`` copy build from **stage** to **prod** and put a versioned copy in the *archive* directory.


<br/>

> **It's just a file mover!**  But the thought is that you can setup your deployments to pull from the corresponding environment directory.



### Commands

  - **push** : download remote build & upload to first environment (dev)
  - **push-local** : upload local build to first environment (dev)
  - **promote** : copies specified env build to configured promotesTo env. may also archive based on configuration. --env is required, --ver may be required. example: buddy promote --env stage --ver 1.16.1
  - **info** : list the current status of each environment
  - **bucket** : list the contents of the configured bucket


### Config

After first run a config file will be generated into your home dir.  

``~/.aws-buddy.json``

***Note:*** *You can specify a different config file by using the ``-f, --file`` options. This is useful if you want to use AWS Buddy with multiple different applications.*

You will need to edit this file.  Here is an example...
```javascript
    {
        "awsRegion": "us-east-1",  // AWS S3 region
        "awsProfile": "user2"  // AWS Named Profile for alternate credentials - OPTIONAL (you will normally not need this)
        "bucket": "S3_BUCKET_NAME", // AWS S3 bucket name
        "buildFileName": "MyCoolAppBuild.zip", // build file name in S3
        "localBuildFile": "~/dev/MyCoolAppBuild.zip", // location of the local build file, used in the push-local cmd
        "infoFile": "info.json", // name of the meta file that is written to S3
        "archive": {
            "dir": "build/archive", // archive s3 dir
            "prefix": "MyCoolApp-", // archive file name prefix
            "suffix": ".zip"  // archive file name suffix
        },
        "remoteBuild": {
            "url": "http://buildserver.net/MyCoolAppBuild.zip", // url to download remote build, used in push cmd
            "user": "me@company.com",  // basic auth user
            "pass": "password-in-clear-fail",  // basic auth pass
            "localBuildFile": "~/temp/MyCoolAppBuild.zip" // location on local machine to save the downloaded build
        },
        // You can add additional environments or edit these.
        "environments": {
            "prod": {
                "label": "Production", // Display name
                "key": "prod", // must match hash key
                "order": 3,  // order lower goes first
                "dir": "build/env/prod",  // dir in s3
                "promotesTo": false,   // where does this env promote to
                "archiveOnPromote": true  // should we archive when an env is promoted to this env
            },
            "stage": {
                "label": "Stage",
                "key": "stage",
                "order": 2,
                "dir": "build/env/stage",
                "promotesTo": "prod",
                "archiveOnPromote": false
            },
            "dev": {
                "label": "Development",
                "key": "dev",
                "order": 1,
                "dir": "build/env/dev",
                "promotesTo": "stage",
                "archiveOnPromote": false
            }
        }
    }
```


[![NPM](https://nodei.co/npm/aws-buddy.png?downloads=true)](https://www.npmjs.com/package/aws-buddy)
