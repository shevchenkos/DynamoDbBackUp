# dynamodb-backup-restore

This tool supports following functionality:
1. Full backup AWS DynamoDb table to Amazon S3 bucket within or between regions.
2. Incremental backup AWS DynamoDb table to Amazon S3 bucket within or between regions.
3. AWS Lambda based incremental backup AWS DynamoDb  tableto Amazon S3 bucket within or between regions.
4. Restore AWS DynamoDb table from Amazon S3 bucket within or between regions.
5. Deploy and configure Amazon S3 backup bucket.
6. Deploy, configure AWS Lambda and add event source.

Built on NodeJS calsses and ECMAScript 2015 (ES6).
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
            S3Prefix: 'STRING_VALUE', /* optional */
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

