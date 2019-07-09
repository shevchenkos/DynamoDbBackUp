'use strict';

const AWS = require('aws-sdk');
const _ = require('lodash');
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

class DbStreamData {
    constructor(config) {
        this.DbTable = config.DbTable;
        this.DbRegion = config.DbRegion;
    }

    retrieve() {
        return this.getStreamArn()
            .then(sreamArn => {
                return this.getStreamShards(sreamArn)
                    .then(shards => {
                        return this.getShardIterators(shards, sreamArn);
                    })
                    .then(iterators => {
                        return this.getRecords(iterators);
                    })
                    .catch(err => {
                        throw err;
                    });
            })
            .catch(err => {
                throw err;
            });
    }

    getStreamArn() {
        return new Promise((resolve, reject) => {
            let dynamodb = new AWS.DynamoDB({ region: this.DbRegion });
            let params = {
                TableName: this.DbTable
            };
            dynamodb.describeTable(params, (err, data) => {
                if (err) {
                    return reject(err);
                }
                else {
                    console.log('Retrieved stream ARN ' + data.Table.LatestStreamArn);
                    return resolve(data.Table.LatestStreamArn);
                }
            });
        });
    }

    getStreamShards(streamArn) {
        return new Promise((resolve, reject) => {
            let dynamodbstreams = new AWS.DynamoDBStreams({ region: this.DbRegion });
            let params = {
                StreamArn: streamArn
            };
            dynamodbstreams.describeStream(params, function (err, data) {
                if (err) {
                    return reject(err);
                }
                else {
                    let shardIds = [];
                    data.StreamDescription.Shards.forEach(shard => {
                        shardIds = shardIds.concat(shard.ShardId);
                    });
                    console.log("Retrieved stream shards " + shardIds);
                    return resolve(shardIds);
                }
            });
        });
    }

    getShardIterators(shards, streamArn) {
        let promises = [];
        shards.forEach(shardId => {
            promises.push(this.getShardIterator(shardId, streamArn));
        });

        return Promise.all(promises);
    }

    getShardIterator(shardId, streamArn) {
        return new Promise((resolve, reject) => {
            let dynamodbstreams = new AWS.DynamoDBStreams({ region: this.DbRegion });
            let params = {
                ShardId: shardId,
                ShardIteratorType: 'TRIM_HORIZON',
                StreamArn: streamArn
            };
            dynamodbstreams.getShardIterator(params, function (err, data) {
                if (err) {
                    return reject(err);
                }
                else {
                    return resolve(data.ShardIterator);
                }
            });
        });
    }

    getRecords(iterators) {
        let promises = [];
        iterators.forEach(iterator => {
            promises.push(this.getRecord(iterator));
        });

        return Promise.all(promises)
            .then(recordsList => {
                let records = [];
                recordsList.forEach(items => {
                    records = records.concat(items);
                });
                return records;
            })
    }

    getRecord(iterator) {
        return new Promise((resolve, reject) => {
            let records = [];
            let dynamodbstreams = new AWS.DynamoDBStreams({ region: this.DbRegion });
            let params = {
                ShardIterator: iterator
            };

            let steps = 10;
            function recursiveCall(params) {
                dynamodbstreams.getRecords(params, (err, data) => {
                    if (err) {
                        return reject(err);
                    }

                    if(_.isEmpty(data.Records)){
                        steps--;
                    }

                    data.Records.forEach(item => {
                        steps = 10;
                        records.push(item);
                    });

                    if (data.NextShardIterator && steps !== 0) {
                        params.ShardIterator = data.NextShardIterator;
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

module.exports = DbStreamData;
