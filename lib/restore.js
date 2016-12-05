'use strict';

const VersionList = require('./bin/versionList');
const RestoreDynamoDb = require('./bin/restoreDynamoDb');
const _ = require('lodash');


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
