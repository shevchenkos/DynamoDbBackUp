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

class VersionList {
    constructor(config, versionReaderFunc) {
        this.RestoreTime = config.RestoreTime;
        this.S3Bucket = config.S3Bucket;
        this.S3Prefix = config.S3Prefix;
        this.S3Region = config.S3Region;
        this.VersionReaderFunc = versionReaderFunc === undefined ? this.getAllVersions : versionReaderFunc;
    }

    getVersions() {
        return this.VersionReaderFunc()
            .then(allVersionList => {
                return this.versionListCreatedBeforeGivenTime(allVersionList)
                    .then(versionList => {
                        return this.versionListCreatedAfterGivenTime(versionList, allVersionList);
                    })
                    .then(versionList => {
                        return this.versionListDeleted(versionList, allVersionList)
                    })
                    .then(versionList => {
                        return this.beautifyVersionList(versionList)
                    })
                    .catch(err => {
                        throw err;
                    });
            })
            .catch(err => {
                throw err;
            });
    }

    getAllVersions() {
        return new Promise((resolve, reject) => {
            let s3DataContents = [];
            let params = { Bucket: this.S3Bucket, Prefix: this.S3Prefix };
            let s3 = new AWS.S3({ region: this.S3Region, signatureVersion: "v4" });
            function recursiveCall(params) {
                s3.listObjectVersions(params, (err, data) => {
                    if (err) {
                        return reject('Failed to retrieve object versions from S3: ' + err);
                    }
                    let contents = data;
                    s3DataContents = s3DataContents.concat(contents.Versions);

                    contents.DeleteMarkers.forEach(marker => {
                        marker.DeletedMarker = true;
                    });

                    s3DataContents = s3DataContents.concat(contents.DeleteMarkers);

                    if (data.IsTruncated) {
                        params.KeyMarker = contents.NextKeyMarker;
                        params.VersionIdMarker = contents.NextVersionIdMarker;
                        recursiveCall.call(this, params);
                    } else {
                        resolve(s3DataContents);
                    }
                });
            }

            recursiveCall.call(this, params);
        });
    }

    versionListCreatedBeforeGivenTime(allObjectVersions) {
        return new Promise(resolve => {

            let filteredData = allObjectVersions.filter(version => {
                if (this.RestoreTime === undefined) {
                    return true;
                }
                return (this.RestoreTime - new Date(version.LastModified)) >= 0;
            });

            let newData = {};

            filteredData.forEach(data => {
                if (!(data.Key in newData) || ((new Date(newData[data.Key].LastModified) - new Date(data.LastModified)) < 0)) {
                    newData[data.Key] = data;
                }
            });

            return resolve(newData);
        });
    }

    versionListCreatedAfterGivenTime(versionList, allObjectVersions) {
        return new Promise(resolve => {
            allObjectVersions.forEach(data => {
                let diff = this.RestoreTime === undefined ? -1 : (this.RestoreTime - new Date(data.LastModified));
                if (diff < 0 && !(data.Key in versionList)) {
                    versionList[data.Key] = data;
                    versionList[data.Key].DeletedMarker = true;
                }
            });

            return resolve(versionList);
        });
    }

    versionListDeleted(versionList, allObjectVersions) {
        return new Promise(resolve => {
            function filterObject(obj, predicate) {
                let result = {}, key;

                for (key in obj) {
                    if (obj.hasOwnProperty(key) && predicate(obj[key])) {
                        result[key] = obj[key];
                    }
                }

                return result;
            };

            let deletedRecords = filterObject.call(this, versionList, data => {
                return data.DeletedMarker && !data.Size;
            });

            Object.keys(deletedRecords).forEach(key => {
                let data = deletedRecords[key];
                let existingVersions = filterObject.call(this, allObjectVersions, version => {
                    return (version.Key === data.Key && version.Size);
                });
                let keys = Object.keys(existingVersions);
                if (existingVersions && keys.length > 0) {
                    data.existingVersionId = existingVersions[keys[0]].VersionId;
                }
            });

            return resolve(versionList);
        });
    }

    beautifyVersionList(versionList) {
        return new Promise(resolve => {
            let newData = {};
            Object.keys(versionList).forEach(key => {
                let version = versionList[key];
                if (version.existingVersionId) {
                    version.VersionId = version.existingVersionId
                }
                if (this.S3Prefix === version.Key || this.S3Prefix + '/' === version.Key) {
                    return;
                }
                newData[key] = {
                    Key: version.Key,
                    VersionId: version.VersionId,
                    DeletedMarker: version.DeletedMarker
                };
            });

            return resolve(newData);
        });
    }
}

module.exports = VersionList;
