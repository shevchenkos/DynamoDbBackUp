#dynamodb-backup-restore

This is tool to back up DynamoDb table to S3 bucket and restore S3 objects to DynamoDb table.

This tool looks like many other but has a great advantage - implemented with classes and ES6.

This tool requires to set all parameters except Restore Time.


###Usage sample from AWS Lambda
```
module.exports.handler = (event, context, callback) => {
    let config = {
        S3Bucket: 'STRING_VALUE', /* required */
        S3Region: 'STRING_VALUE', /* required */
        S3Prefix: 'STRING_VALUE', /* required */
    };
​
    let backup = new Backup(config);
    return backupRecords.fromDbStream(event.Records).then(() => {
        callback();
    }).catch(err => {
        callback(err);
    });
}
```
