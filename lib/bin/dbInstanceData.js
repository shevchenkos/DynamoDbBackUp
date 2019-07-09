'use strict';

const AWS = require('aws-sdk');
const HttpsProxyAgent = require('proxy-agent');
// Use HTTPS Proxy (Optional)
const proxy = process.env.proxy
  || process.env.HTTP_PROXY
  || process.env.http_proxy
  || process.env.HTTPS_PROXY
  || process.env.https_proxy

if (proxy) {
  AWS.config.update({
    httpOptions: {
      agent: HttpsProxyAgent(proxy)
    }
  });
}

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

            let dynamodb = new AWS.DynamoDB({ region: this.DbRegion });
            let params = {
                TableName: this.DbTable,
                ExclusiveStartKey: null,
                Limit: 100,
                Select: 'ALL_ATTRIBUTES'
            };

            var numberOfRecords = 0;

            function recursiveCall(params) {
                return new Promise((rs, rj) => {

                    dynamodb.scan(params, (err, data) => {
                        if (err) {
                            return rj(err);
                        }
                        
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
                        Promise.all(promises)
                            .then(() => {
                                numberOfRecords += data.Items.length;
                                console.log('Retrieved ' + data.Items.length + ' records; total at ' + numberOfRecords + ' records.');
                                if (data.LastEvaluatedKey) {
                                    params.ExclusiveStartKey = data.LastEvaluatedKey;
                                    return recursiveCall.call(this, params).then(() => rs());
                                } 
                                return rs();
                            })
                            .catch(err => {
                                rj(err);
                            });
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
