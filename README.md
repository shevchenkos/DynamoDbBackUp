# dynamodb-backup-restore

[![Build status](https://travis-ci.org/shevchenkos/DynamoDbBackUp.svg?branch=master)](https://travis-ci.org/shevchenkos/DynamoDbBackUp)

This tool supports the following functionality:
- Full backup of AWS DynamoDb table to Amazon S3 bucket within or between regions.
- Incremental backup of AWS DynamoDb table to Amazon S3 bucket within or between regions.
- AWS Lambda based incremental backup of AWS DynamoDb table to Amazon S3 bucket within or between regions.
- Restore AWS DynamoDb table from Amazon S3 bucket within or between regions.
- Deploy and configure Amazon S3 backup bucket.
- Deploy, configure AWS Lambda and add event source.

Built on NodeJS classes and ECMAScript 2015 (ES6).

It can be used independently and as a dependency in your code.

## Usage samples
### Full backup
```bash
$ gulp backup-full --s3bucket <bucket> --s3prefix <prefix> --s3region <region> --dbtable <table> --dbregion <region>
Options:
  --s3bucket      (required)  Amazon S3 backup bucket name
  --s3prefix      (optional)  subfolder for backup (recommend use AWS DynamoDb table name)
  --s3encryption  (optional)  AES256 (default) or aws:kms
  --s3region      (required)  AWS Region for Amazon S3 backup bucket
  --dbtable       (required)  AWS DynamoDb table name
  --dbregion      (required)  AWS Region for AWS DynamoDb table
```

```javascript
const Backup = require('dynamodb-backup-restore').Backup;

let config = {
    S3Bucket:     'STRING_VALUE', /* required */
    S3Prefix:     'STRING_VALUE', /* optional */
    S3Encryption: 'STRING_VALUE', /* optional */
    S3Region:     'STRING_VALUE', /* required */
    DbTable:      'STRING_VALUE', /* required */
    DbRegion:     'STRING_VALUE'  /* required */
};
let backup = new Backup(config);
backup.full();
```

### Incremental backup
```bash
$ gulp backup-incremental --s3bucket <bucket> --s3prefix <prefix> --s3region <region> --dbtable <table> --dbregion <region>
Options:
  --s3bucket      (required)  Amazon S3 backup bucket name
  --s3prefix      (optional)  subfolder for backup (recommend use AWS DynamoDb table name)
  --s3encryption  (optional)  AES256 (default) or aws:kms
  --s3region      (required)  AWS Region for Amazon S3 backup bucket
  --dbtable       (required)  AWS DynamoDb table name
  --dbregion      (required)  AWS Region for AWS DynamoDb table
```

```javascript
const Backup = require('dynamodb-backup-restore').Backup;

let config = {
    S3Bucket:     'STRING_VALUE', /* required */
    S3Prefix:     'STRING_VALUE', /* optional */
    S3Encryption: 'STRING_VALUE', /* optional */
    S3Region:     'STRING_VALUE', /* required */
    DbTable:      'STRING_VALUE', /* required */
    DbRegion:     'STRING_VALUE'  /* required */
};
let backup = new Backup(config);
backup.incremental();
```

### AWS Lambda based incremental backup

The DynamoDB Stream StreamViewType needs to be one of `NEW_IMAGE`, `NEW_AND_OLD_IMAGES`, or `KEYS_ONLY`.

Note that [DynamoDB Streams does not support encryption at rest](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/encryption-before-you-start.html).

```javascript
const Backup = require('dynamodb-backup-restore').Backup;

module.exports.handler = (event, context, callback) => {
    if (!event.Records) {
        callback('There are no items to process.');
    }
    else {
        let config = {
            S3Bucket:     'STRING_VALUE', /* required */
            S3Region:     'STRING_VALUE', /* required */
            S3Encryption: 'STRING_VALUE', /* optional */
            S3Prefix:     'STRING_VALUE', /* optional */
            DbTable:      'STRING_VALUE', /* required if stream is KEYS_ONLY, ignored otherwise */
            DbRegion:     'STRING_VALUE', /* required if stream is KEYS_ONLY, ignored otherwise */
        };
        let backup = new Backup(config);
        backup.fromDbStream(event.Records).then(() => {
            callback();
        }).catch(err => {
            callback(err);
        });
    }
}
```
### Restore
```bash
$ gulp restore --s3bucket <bucket> --s3prefix <prefix> --s3region <region> --dbtable <table> --dbregion <region>
Options:
  --s3bucket     (required)  Amazon S3 backup bucket name
  --s3prefix     (optional)  subfolder for backup(recomend use AWS DynamoDb table name)
  --s3region     (required)  AWS Region for Amazon S3 backup bucket
  --dbtable      (required)  AWS DynamoDb table name
  --dbregion     (required)  AWS Region for AWS DynamoDb table
  --restoretime  (required)  JavaScript timestamp of when to restore to
```

```javascript
const Restore = require('dynamodb-backup-restore').Restore;

let config = {
    S3Bucket:   'STRING_VALUE', /* required */
    S3Prefix:   'STRING_VALUE', /* optional */
    S3Region:   'STRING_VALUE', /* required */
    DbTable:    'STRING_VALUE', /* required */
    DbRegion:   'STRING_VALUE', /* required */
    RestoreTime:'STRING_VALUE'  /* optional */
};
Restore(config);
```

### Deploy S3 Backup Bucket
```bash
$ gulp deploy-s3-bucket --s3bucket <bucket> --s3region <region>
Options:
  --s3bucket  (required)  Amazon S3 backup bucket name
  --s3region  (required)  AWS Region for Amazon S3 backup bucket
```

```javascript
const Deploy = require('dynamodb-backup-restore').Deploy;

let config = {
    S3Bucket: 'STRING_VALUE', /* required */
    S3Region: 'STRING_VALUE'  /* required */
};
let deploy = new Deploy(config);
deploy.backupBucket();
```

### Deploy AWS Lambda Function
```bash
$ gulp deploy-lambda --s3bucket <bucket> --s3prefix <prefix> --s3region <region> --dbregion <region> --lName <lambdaName> --lRegion <region> --lAlias <lambdaAlias> --lRoleName <lambdaRole>
Options:
  --s3bucket    (required)  Amazon S3 backup bucket name
  --s3prefix    (optional)  subfolder for backup (recommend use AWS DynamoDb table name)
  --s3region    (required)  AWS Region for Amazon S3 backup bucket
  --dbregion    (required)  AWS Region for AWS DynamoDb table
  --lName       (required)  AWS Lambda Function Name
  --lRegion     (required)  AWS Region for AWS Lambda Funtion
  --lAlias      (required)  AWS Lambda Function Alias
  --lRoleName   (required)  AWS Lambda Function Execution Role
  --lMemorySize (optional)  AWS Lambda MemorySize in MB (defaults to 128)
  --lTimeout    (optional)  AWS Lambda Timeout in Seconds (defaults to 6)
```

```javascript
const Deploy = require('dynamodb-backup-restore').Deploy;

let config = {
    S3Bucket:         'STRING_VALUE', /* required */
    S3Prefix:         'STRING_VALUE', /* optional */
    S3Region:         'STRING_VALUE', /* required */
    DbRegion:         'STRING_VALUE', /* required */
    LambdaName:       'STRING_VALUE', /* required */
    LambdaRegion:     'STRING_VALUE', /* required */
    LambdaAlias:      'STRING_VALUE', /* required */
    LambdaRoleName:   'STRING_VALUE', /* required */
    LambdaMemorySize: 'STRING_VALUE', /* optional */
    LambdaTimeout:    'STRING_VALUE'  /* optional */  
};
let deploy = new Deploy(config);
deploy.lambda();
```

### Deploy AWS Lambda Event
```bash
$ gulp deploy-lambda-event --dbtable <table> --dbregion <region> --lName <lambdaName> --lRegion <region> --lAlias <lambdaAlias>
Options:
  --dbtable   (required)  AWS DynamoDb table name
  --dbregion  (required)  AWS Region for AWS DynamoDb table
  --lName     (required)  AWS Lambda Function Name
  --lRegion   (required)  AWS Region for AWS Lambda Funtion
  --lAlias    (required)  AWS Lambda Function Alias
```

```javascript
const Deploy = require('dynamodb-backup-restore').Deploy;

let config = {
    DbTable:        'STRING_VALUE', /* required */
    DbRegion:       'STRING_VALUE', /* required */
    LambdaName:     'STRING_VALUE', /* required */
    LambdaRegion:   'STRING_VALUE', /* required */
    LambdaAlias:    'STRING_VALUE'  /* required */
};
let deploy = new Deploy(config);
deploy.lambdaEvent();
```
