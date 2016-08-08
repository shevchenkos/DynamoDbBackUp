# dynamodb-backup-restore

This tool supports following functionality:
- Full backup AWS DynamoDb table to Amazon S3 bucket within or between regions.
- Incremental backup AWS DynamoDb table to Amazon S3 bucket within or between regions.
- AWS Lambda based incremental backup AWS DynamoDb  table to Amazon S3 bucket within or between regions.
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
  --s3bucket  (required)  Amazon S3 backup bucket name 
  --s3prefix  (optional)  subfolder for backup(recomend use AWS DynamoDb table name) 
  --s3region  (required)  AWS Region for Amazon S3 backup bucket
  --dbtable   (required)  AWS DynamoDb table name 
  --dbregion  (required)  AWS Region for AWS DynamoDb table
```

```javascript
const Backup = require('dynamodb-backup-restore').Backup;

let config = {
    S3Bucket: 'STRING_VALUE', /* required */
    S3Prefix: 'STRING_VALUE', /* optional */
    S3Region: 'STRING_VALUE', /* required */
    DbTable:  'STRING_VALUE', /* required */
    DbRegion: 'STRING_VALUE'  /* required */
};
let backup = new Backup(config);
backup.full();
```

### Incremental backup
```bash
$ gulp backup-incremental --s3bucket <bucket> --s3prefix <prefix> --s3region <region> --dbtable <table> --dbregion <region>
Options:
  --s3bucket  (required)  Amazon S3 backup bucket name 
  --s3prefix  (optional)  subfolder for backup(recomend use AWS DynamoDb table name) 
  --s3region  (required)  AWS Region for Amazon S3 backup bucket
  --dbtable   (required)  AWS DynamoDb table name 
  --dbregion  (required)  AWS Region for AWS DynamoDb table
```

```javascript
const Backup = require('dynamodb-backup-restore').Backup;

let config = {
    S3Bucket: 'STRING_VALUE', /* required */
    S3Prefix: 'STRING_VALUE', /* optional */
    S3Region: 'STRING_VALUE', /* required */
    DbTable:  'STRING_VALUE', /* required */
    DbRegion: 'STRING_VALUE'  /* required */
};
let backup = new Backup(config);
backup.incremental();
```

### AWS Lambda based incremental backup
```javascript
const Backup = require('dynamodb-backup-restore').Backup;

module.exports.handler = (event, context, callback) => {
    if (!event.Records) {
        callback('There are no items to process.');
    }
    else {
        let config = {
            S3Bucket: 'STRING_VALUE', /* required */
            S3Region: 'STRING_VALUE', /* required */
            S3Prefix: 'STRING_VALUE'  /* optional */
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
  --s3bucket  (required)  Amazon S3 backup bucket name 
  --s3prefix  (optional)  subfolder for backup(recomend use AWS DynamoDb table name) 
  --s3region  (required)  AWS Region for Amazon S3 backup bucket
  --dbtable   (required)  AWS DynamoDb table name 
  --dbregion  (required)  AWS Region for AWS DynamoDb table
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
$ gulp deploy-lambda --s3bucket <bucket> --s3prefix <prefix> --s3region <region> --dbtable <table> --dbregion <region> --lName <lambdaName> --lRegion <region> --lAlias <lambdaAlias> --lRoleName <lambdaRole>
Options:
  --s3bucket  (required)  Amazon S3 backup bucket name 
  --s3prefix  (optional)  subfolder for backup(recomend use AWS DynamoDb table name) 
  --s3region  (required)  AWS Region for Amazon S3 backup bucket
  --dbtable   (required)  AWS DynamoDb table name 
  --dbregion  (required)  AWS Region for AWS DynamoDb table
  --lName     (required)  AWS Lambda Function Name
  --lRegion   (required)  AWS Region for AWS Lambda Funtion 
  --lAlias    (required)  AWS Lambda Function Alias
  --lRoleName (required)  AWS Lambda Function Execution Role
```

```javascript
const Deploy = require('dynamodb-backup-restore').Deploy;

let config = {
    S3Bucket:       'STRING_VALUE', /* required */
    S3Prefix:       'STRING_VALUE', /* optional */
    S3Region:       'STRING_VALUE', /* required */
    DbTable:        'STRING_VALUE', /* required */
    DbRegion:       'STRING_VALUE', /* required */
    LambdaName:     'STRING_VALUE', /* required */
    LambdaRegion:   'STRING_VALUE', /* required */
    LambdaAlias:    'STRING_VALUE', /* required */
    LambdaRoleName: 'STRING_VALUE'  /* required */
};
let deploy = new Deploy(config);
deploy.lambda();
```

### Deploy AWS Lambda Event
```bash
$ gulp deploy-lambda-event --dbtable <table> --dbregion <region> --lName <lambdaName> --lRegion <region>
Options:
  --dbtable   (required)  AWS DynamoDb table name 
  --dbregion  (required)  AWS Region for AWS DynamoDb table
  --lName     (required)  AWS Lambda Function Name
  --lRegion   (required)  AWS Region for AWS Lambda Funtion 
```

```javascript
const Deploy = require('dynamodb-backup-restore').Deploy;

let config = {
    DbTable:        'STRING_VALUE', /* required */
    DbRegion:       'STRING_VALUE', /* required */
    LambdaName:     'STRING_VALUE', /* required */
    LambdaRegion:   'STRING_VALUE'  /* required */
};
let deploy = new Deploy(config);
deploy.lambdaEvent();
```
