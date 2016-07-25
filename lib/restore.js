'use strict';

let VersionList = require('./bin/versionList');
let RestoreDynamoDb = require('./bin/restoreDynamoDb');
let _ = require('lodash');


function restore(config) {
    return new Promise((resolve, reject) => {
        for (let key in config) {
            if (_.isEmpty(config[key].toString())) {
                return reject(`Missing ${key} in config`);
            }
        }

        let versionList = new VersionList(config);
        let restoreDynamoDb = new RestoreDynamoDb(config);

        console.time('BuildVersionListFromS3');
        return versionList.getVersions()
            .then(data => {
                console.log('Sending this data to Dynamo: ' + JSON.stringify(data, null, 2));
                console.timeEnd('BuildVersionListFromS3');
                console.time('PushToDynamo');
                return restoreDynamoDb.s3ToDynamoDb(data)
                    .then(() => {
                        console.timeEnd('PushToDynamo');
                        console.log('Success!');
                        resolve();
                    })
                    .catch(err => {
                        reject(err);
                    });
            })
            .catch(err => {
                reject(err);
            });
    });

}

module.exports = restore;
