'use strict';

const VersionList = require('./bin/versionList');
const RestoreDynamoDb = require('./bin/restoreDynamoDb');
const { validateRestoreConfig } = require('./bin/validation');

/**
 * Restores a DynamoDB table from S3 backups
 * @param {object} config - Configuration object
 * @param {string} config.S3Bucket - S3 bucket name containing backups
 * @param {string} config.S3Region - AWS region for S3 bucket
 * @param {string} config.DbTable - DynamoDB table name to restore to
 * @param {string} config.DbRegion - AWS region for DynamoDB table
 * @param {string} [config.S3Prefix] - Optional S3 prefix/folder for backups
 * @param {Date|number} [config.RestoreTime] - Optional timestamp to restore to (defaults to latest)
 * @returns {Promise} Promise that resolves when restore is complete
 * @throws {Error} If configuration is invalid or restore fails
 */
function restore(config) {
    return new Promise((resolve, reject) => {
        const validation = validateRestoreConfig(config);
        if (!validation.valid) {
            return reject(new Error(`Invalid restore configuration: ${validation.errors.join(', ')}`));
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
