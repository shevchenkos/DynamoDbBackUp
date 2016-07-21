'use strict';

const AWS = require('aws-sdk');
const crypto = require('crypto');

class BackupRecords {
    constructor(config) {
        this.Bucket = config.S3Bucket;
        this.Region = config.S3Region;
        this.Prefix = config.S3Prefix;
    }

    fromDbStream(records) {
        let allRecords = records.reduce((allRecords, action) => {
            let id = JSON.stringify(action.dynamodb.Keys);
            allRecords[id] = allRecords[id] || [];
            console.log(action);
            let change = {
                keys: id,
                data: JSON.stringify(action.dynamodb.NewImage),
                event: action.eventName,
                table: action.eventSourceARN.split('/')[1]
            };
            allRecords[id].push(change);
            return allRecords;
        }, {});

        let promises = [];
        Object.keys(allRecords).forEach(key => {
            promises.push(this.backupRecord(allRecords[key]));
        });
        return Promise.all(promises);
    }

    fromDbInstance(records) {
        
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
                .update(change.keys)
                .digest('hex');
            let table = change.table;
            let key = [this.Prefix, table, id].join('/');

            let params = {
                Bucket: this.Bucket,
                Key: key
            };

            let req = change.event === 'REMOVE' ? 'deleteObject' : 'putObject';
            if (req === 'putObject') params.Body = change.data;

            s3[req](params, (err) => {
                if (err) {
                    console.log(
                        '[error] %s | %s s3://%s/%s | %s',
                        change.keys, req, params.Bucket, params.Key, err.message
                    );
                    return reject(err);
                }
                return resolve();
            });
        });
    }
}

module.exports = BackupRecords;
