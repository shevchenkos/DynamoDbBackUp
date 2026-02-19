'use strict';

const AWS = require('aws-sdk');
const { retryAwsCall } = require('./retry');

class DbInstanceData {
    constructor(config, dbRecord) {
        this.DbTable = config.DbTable;
        this.DbRegion = config.DbRegion;
        this.dbRecord = dbRecord;
    }

    retrieve() {
        return this.getTableKeys()
            .then(keys => {
                return this.getRecords(keys)
                    .catch(err => {
                        throw err;
                    });
            })
            .catch(err => {
                throw err;
            });
    }

    getItem(Key) {
        let dynamodb = new AWS.DynamoDB({ region: this.DbRegion });
        let params = {
            Key,
            TableName: this.DbTable,
            ConsistentRead: true
        };
        return dynamodb.getItem(params).promise()
            .then(data => {
                if (data && data.Item) {
                    return data.Item;
                }
                return {}
            });
    }

    getTableKeys() {
        let dynamoDb = new AWS.DynamoDB({ region: this.DbRegion });
        return retryAwsCall(dynamoDb.describeTable.bind(dynamoDb), { TableName: this.DbTable }, {
            maxRetries: 3,
            initialDelay: 1000,
            maxDelay: 10000
        }).then(data => {
            console.log('Got key schema ' + JSON.stringify(data.Table.KeySchema));
            return data.Table.KeySchema;
        });
    }

    getRecords(keys) {
        return new Promise((resolve, reject) => {

            let dynamodb = new AWS.DynamoDB({ region: this.DbRegion });
            let params = {
                TableName: this.DbTable,
                ExclusiveStartKey: null,
                Limit: 100,
                Select: 'ALL_ATTRIBUTES'
            };

            var numberOfRecords = 0;

            function recursiveCall(params) {
                return retryAwsCall(dynamodb.scan.bind(dynamodb), params, {
                    maxRetries: 3,
                    initialDelay: 1000,
                    maxDelay: 10000
                }).then(data => {
                    let records = [];
                    data.Items.forEach((item) => {
                        let id = {};
                        keys.forEach(key => {
                            id[key.AttributeName] = item[key.AttributeName];
                        });

                        let record = {
                            keys: JSON.stringify(id),
                            data: JSON.stringify(item),
                            event: 'INSERT'
                        };
                        records.push(record);
                    });

                    let promises = [];
                    records.forEach(record => {
                        promises.push(this.dbRecord.backup([record]));
                    });
                    return Promise.all(promises)
                        .then(() => {
                            numberOfRecords += data.Items.length;
                            console.log('Retrieved ' + data.Items.length + ' records; total at ' + numberOfRecords + ' records.');
                            if (data.LastEvaluatedKey) {
                                params.ExclusiveStartKey = data.LastEvaluatedKey;
                                return recursiveCall.call(this, params);
                            }
                        });
                });
            }

            recursiveCall.call(this, params)
            .then(data => { 
                resolve() 
            }).catch(err =>{
                reject(err);
            });
        });
    }

}

module.exports = DbInstanceData;
