'use strict';

const AWS = require('aws-sdk');

class DbInstanceData {
    constructor(config) {
        this.DbTable = config.DbTable;
        this.DbRegion = config.DbRegion;
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

    getTableKeys() {
        return new Promise((resolve, reject) => {
            let dynamoDb = new AWS.DynamoDB({ region: this.DbRegion });
            dynamoDb.describeTable({ TableName: this.DbTable }, (err, data) => {
                if (err) {
                    return reject(err);
                }
                console.log('Got key schema ' + JSON.stringify(data.Table.KeySchema));
                return resolve(data.Table.KeySchema);
            });
        });
    }

    getRecords(keys) {
        return new Promise((resolve, reject) => {
            let records = [];
            let dynamodb = new AWS.DynamoDB({ region: this.DbRegion });
            let params = {
                TableName: this.DbTable,
                ExclusiveStartKey: null,
                Limit: 25,
                Select: 'ALL_ATTRIBUTES'
            };

            var numberOfRecords = 0;

            function recursiveCall(params) {
                dynamodb.scan(params, function (err, data) {
                    if (err) {
                        return reject(err);
                    }

                    data.Items.forEach(function (item) {
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

                    numberOfRecords += data.Items.length;
                    console.log('Retrieved ' + data.Items.length + ' records; total at ' + numberOfRecords + ' records.');
                    if (data.LastEvaluatedKey) {
                        params.ExclusiveStartKey = data.LastEvaluatedKey;
                        recursiveCall.call(this, params);
                    } else {
                        resolve(records);
                    }
                });
            }

            recursiveCall.call(this, params);
        });
    }

}

module.exports = DbInstanceData;
