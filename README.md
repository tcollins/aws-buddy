## AWS Buddy: A Build Manager for S3


### Install

Clone this repo and run..
`npm install -g`

From command line. type.. ``buddy --help``


*coming soon*  -> ``npm install -g aws-buddy``


### Config

After first run a config file will be generated into your home dir.  

``~/.aws-buddy.json``


You will need to edit this file.  Here is an example...

    {
        "awsRegion": "us-east-1",
        "bucket": "S3_BUCKET_NAME",
        "buildFileName": "MyCoolAppBuild.zip",
        "localBuildFile": "~/dev/MyCoolAppBuild.zip",
        "infoFile": "info.json",
        "archive": {
            "dir": "build/archive",
            "prefix": "MyCoolApp-",
            "suffix": ".zip"
        },
        "remoteBuild": {
            "url": "http://buildserver.net/MyCoolAppBuild.zip",
            "user": "me@company.com",
            "pass": "password-in-clear-fail",
            "localBuildFile": "~/temp/MyCoolAppBuild.zip"
        },
        "environments": {
            "prod": {
                "label": "Production",
                "key": "prod",
                "order": 3,
                "dir": "build/env/prod",
                "promotesTo": false,
                "archiveOnPromote": true
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
