'use strict';

const AWS = require('aws-sdk');
const crypto = require('crypto');

class BackupRecords {
    constructor(config) {
        this.Bucket = config.S3Bucket;
        this.Region = config.S3Region;
        this.Prefix = config.S3Prefix;
    }

    backupAll(records) {
        let allRecords = records.reduce((allRecords, action) => {
            let id = JSON.stringify(action.dynamodb.Keys);
            allRecords[id] = allRecords[id] || [];
            allRecords[id].push(action);
            return allRecords;
        }, {});

        let promises = [];
        Object.keys(allRecords).forEach(key => {
            promises.push(this.backupRecord(allRecords[key]));
        });
        return Promise.all(promises);
    }

    backupRecord(changes) {
        let promises = [];
        changes.forEach(change => {
            promises.push(this.backupRecordChange(change));
        });
        return Promise.all(promises);
    }

    backupRecordChange(change) {
        return new Promise((resolve, reject) => {
            let s3 = new AWS.S3({ region: this.Region, signatureVersion: "v4" });

            let id = crypto.createHash('md5')
                .update(JSON.stringify(change.dynamodb.Keys))
                .digest('hex');
            let table = change.eventSourceARN.split('/')[1];
            let key = [this.Prefix, table, id].join('/');

            let params = {
                Bucket: this.Bucket,
                Key: key
            };

            let req = change.eventName === 'REMOVE' ? 'deleteObject' : 'putObject';
            if (req === 'putObject') params.Body = JSON.stringify(change.dynamodb.NewImage);

            s3[req](params, (err) => {
                if (err) {
                    console.log(
                        '[error] %s | %s s3://%s/%s | %s',
                        JSON.stringify(change.dynamodb.Keys),
                        req, params.Bucket, params.Key, err.message
                    );
                    return reject(err);
                }
                return resolve();
            });
        });
    }
}

module.exports = BackupRecords;
