#dynamodb-backup-restore

This is tool to back up DynamoDb table to S3 bucket and restore S3 objects to DynamoDb table.

This tool looks like many other but has a great advantage - implemented with classes and ES6.

This tool requires to set all parameters except Restore Time.


##Usage samples
### Full backup
```
$ gulp backup-full --s3bucket s3-bucket --s3prefix s3-prefix --s3region s3-region --dbtable db-name --dbregion db-region
```
### Incremental backup
```
$ gulp backup-incremental --s3bucket s3-bucket --s3prefix s3-prefix --s3region s3-region --dbtable db-name --dbregion db-region
```
### AWS Lambda
```
module.exports.handler = (event, context, callback) => {
    let config = {
        S3Bucket: 'STRING_VALUE', /* required */
        S3Region: 'STRING_VALUE', /* required */
        S3Prefix: 'STRING_VALUE', /* required */
    };
    
    let backup = new Backup(config);
    return backup.fromDbStream(event.Records).then(() => {
        callback();
    }).catch(err => {
        callback(err);
    });
}
```
### Restore
```
$ gulp restore --s3bucket s3-bucket --s3prefix s3-prefix --s3region s3-region --dbtable db-name --dbregion db-region
```

