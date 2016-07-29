'use strict';

const AWS = require('aws-sdk');
const util = require('util');
const exec = require('child_process').exec;
const fs = require('fs');
const Zip = require('node-zip');
const fse = require('fs-extra');
const path = require('path');

class LambdaInfrastructure {
    constructor(config) {
        this.LambdaName = config.LambdaName;
        this.LambdaRegion = config.LambdaRegion;
        this.LambdaAlias = config.LambdaAlias;
        this.LambdaRoleName = config.LambdaRoleName;
        this.S3Bucket = config.S3Bucket;
        this.S3Prefix = config.S3Prefix;
        this.S3Region = config.S3Region;;
        this.DbTable = config.DbTable;
        this.DbRegion = config.DbRegion;
    }

    configureRole() {
        return this.getRole()
            .then(role => {
                if (role.IsExists) {
                    return role.Arn;
                }
                return this.createRole();
            })
            .then(role => {
                return this.createPolicy(role);
            })
            .catch(err => {
                throw err;
            });
    }

    getRole() {
        return new Promise(resolve => {
            let iam = new AWS.IAM();
            let params = {
                RoleName: this.LambdaRoleName
            };
            iam.getRole(params, (err, data) => {
                if (err) {
                    resolve({ IsExists: false });
                }
                return resolve({ IsExists: true, Arn: data.Role.Arn });
            });
        });
    }

    createRole() {
        return new Promise((resolve, reject) => {
            let iam = new AWS.IAM();
            let policyDocument = {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {
                            "Service": "lambda.amazonaws.com"
                        },
                        "Action": "sts:AssumeRole"
                    }
                ]
            };
            let params = {
                AssumeRolePolicyDocument: JSON.stringify(policyDocument, null, 2),
                RoleName: this.LambdaRoleName
            };
            iam.createRole(params, (err, data) => {
                if (err) {
                    return reject(err);
                }
                return resolve(data.Role.Arn);
            });
        });
    }

    installPackages() {
        return new Promise((resolve, reject) => {
            exec('cd lambda && npm i', function (err, stdout, stderr) {
                if (err) {
                    return reject(err);
                }
                return resolve();
            });
        });
    }

    createPolicy(role) {
        return new Promise((resolve, reject) => {
            let iam = new AWS.IAM();
            let policyDocument = {
                "Statement": [
                    {
                        "Resource": [
                            util.format("arn:aws:logs:%s:*:*", this.LambdaRegion),
                            util.format("arn:aws:dynamodb:%s:*:table/%s", this.DbRegion, this.DbTable),
                            util.format("arn:aws:dynamodb:%s:*:table/%s/stream/*", this.DbRegion, this.DbTable),
                            util.format("arn:aws:lambda:%s:*:*", this.LambdaRegion),
                            util.format("arn:aws:s3:::%s/*", this.S3Bucket)
                        ],
                        "Action": [
                            "logs:CreateLogGroup",
                            "logs:CreateLogStream",
                            "logs:PutLogEvents",
                            "lambda:InvokeFunction",
                            "s3:*",
                            "dynamodb:*"
                        ],
                        "Effect": "Allow"
                    }
                ],
                "Version": "2012-10-17"
            };
            let params = {
                PolicyDocument: JSON.stringify(policyDocument, null, 2),
                PolicyName: 'backup-policy',
                RoleName: this.LambdaRoleName
            };
            iam.putRolePolicy(params, err => {
                if (err) {
                    return reject(err);
                }
                return resolve(role);
            });
        });
    }

    deploy(roleArn) {
        return this.getArchive()
            .then(() => {
                return this.isFunctionExists();
            })
            .then(isExists => {
                if (isExists) {
                    return this.updateConfiguration(roleArn)
                        .then(() => {
                            return this.updateCode();
                        })
                }
                else {
                    return this.create(roleArn);
                }
            })
            .catch(err => {
                throw err;
            });
    }

    getArchive() {
        let _this = this;
        let zip = new Zip();
        return new Promise((resolve, reject) => {
            fse.walk('./lambda')
                .on('data', item => {
                    let symbolicLink = item.stats.isSymbolicLink() && fs.existsSync(item.path);
                    if (item.stats.isFile() || symbolicLink) {
                        let name = path.relative('./lambda', item.path);
                        let permissions = fs.statSync(item.path).mode | 0o444;
                        zip.file(name, fs.readFileSync(item.path), {
                            unixPermissions: permissions
                        });
                    }
                })
                .on('end', () => {
                    resolve();
                })
        })
            .then(() => {
                _this.zipName = `${_this.LambdaName}_${_this.LambdaAlias}_${_this.LambdaRegion}.zip`;
                _this.zipBuffer = zip.generate({
                    type: 'nodebuffer',
                    compression: 'DEFLATE',
                    platform: process.platform
                });
                if (!fs.existsSync('./dist')) {
                    fs.mkdirSync('./dist');
                }
                _this.pathCompressed = path.join('./dist', _this.zipName);
                fs.writeFileSync(_this.pathCompressed, _this.zipBuffer);
            });
    }

    isFunctionExists() {
        return new Promise(resolve => {
            let lambda = new AWS.Lambda({ region: this.LambdaRegion });
            let params = {
                FunctionName: this.LambdaName
            };
            lambda.getFunction(params, err => {
                return resolve(!err);
            });
        });
    }

    create(roleArn) {
        return new Promise((resolve, reject) => {
            let lambda = new AWS.Lambda({ region: this.LambdaRegion });
            let params = {
                Code: {
                    ZipFile: this.zipBuffer
                },
                FunctionName: this.LambdaName,
                Handler: 'index.handler',
                Role: roleArn,
                Runtime: 'nodejs4.3',
                Description: 'Backup Lambda',
                MemorySize: 128,
                Timeout: 6
            };
            lambda.createFunction(params, err => {
                if (err) {
                    return reject(err);
                }
                return resolve();
            });
        });
    }

    updateConfiguration(roleArn) {
        return new Promise((resolve, reject) => {
            let lambda = new AWS.Lambda({ region: this.LambdaRegion });
            let params = {
                FunctionName: this.LambdaName,
                Handler: 'index.handler',
                Role: roleArn,
                Description: 'Backup Lambda',
                MemorySize: 128,
                Timeout: 6
            };
            lambda.updateFunctionConfiguration(params, err => {
                if (err) {
                    return reject(err);
                }
                return resolve();
            });
        });
    }

    updateCode() {
        return new Promise((resolve, reject) => {
            let lambda = new AWS.Lambda({ region: this.LambdaRegion });
            let params = {
                FunctionName: this.LambdaName,
                ZipFile: this.zipBuffer
            };
            lambda.updateFunctionCode(params, err => {
                if (err) {
                    return reject(err);
                }
                return resolve();
            });
        });
    }

    configure() {
        return this.publishVersion()
            .then(params => {
                return this.getAlias(params);
            })
            .then(params => {
                return this.updateAlias(params);
            })
            .catch(err => {
                throw err;
            });
    }

    publishVersion() {
        return new Promise((resolve, reject) => {
            let lambda = new AWS.Lambda({ region: this.LambdaRegion });
            let params = {
                FunctionName: this.LambdaName
            };
            lambda.publishVersion(params, (err, data) => {
                if (err) {
                    return reject(err);
                }
                let lParams = {};
                if (!!data.Version && !!data.Description) {
                    lParams = {
                        version: data.Version,
                        description: data.Description
                    };
                }
                return resolve(lParams);
            });
        });
    }

    getAlias(lParams) {
        return new Promise(resolve => {
            let lambda = new AWS.Lambda({ region: this.LambdaRegion });
            let params = {
                FunctionName: this.LambdaName,
                Name: this.LambdaAlias
            };
            lambda.getAlias(params, err => {
                lParams.isAliasExists = !err;
                return resolve(lParams);
            });
        });
    }

    updateAlias(lParams) {
        return new Promise((resolve, reject) => {
            let lambda = new AWS.Lambda({ region: this.LambdaRegion });
            if (lParams.isAliasExists) {
                //update Alias
                let params = {
                    FunctionName: this.LambdaName,
                    FunctionVersion: lParams.version,
                    Name: this.LambdaAlias,
                    Description: lParams.description
                };
                lambda.updateAlias(params, err => {
                    if (err) {
                        return reject(err);
                    }
                    return resolve();
                });
            }
            else {
                //create Alias
                let params = {
                    FunctionName: this.LambdaName,
                    FunctionVersion: lParams.version,
                    Name: this.LambdaAlias,
                    Description: lParams.description
                };
                lambda.createAlias(params, err => {
                    if (err) {
                        return reject(err);
                    }
                    return resolve();
                });
            }
        });
    }

    setEventSource(streamArn) {
        return this.getEventSources(streamArn)
            .then(eventSources => {
                return this.processEventSources(eventSources);
            })
            .catch(err => {
                throw err;
            });
    }

    processEventSources(eventSources) {
        let promises = [];
        eventSources.forEach(eventSource => {
            if (eventSource.action === 'create') {
                promises.push(this.createEventSource(eventSource.arn));
            }
            if (eventSource.action === 'update') {
                promises.push(this.updateEventSource(eventSource.id));
            }
            if (eventSource.action === 'delete') {
                promises.push(this.deleteEventSource(eventSource.id));
            }
        });
        return Promise.all(promises);
    }

    getEventSources(latestArn) {
        return new Promise((resolve, reject) => {
            let lambda = new AWS.Lambda({ region: this.LambdaRegion });
            let params = {
                FunctionName: this.LambdaName
            };
            lambda.listEventSourceMappings(params, (err, data) => {
                if (err) {
                    return reject(err);
                }
                let eventSources = [];
                let foundLatestArn = false;
                data.EventSourceMappings.forEach(item => {
                    if (item.EventSourceArn === latestArn) {
                        foundLatestArn = true;
                    }
                    let action = item.EventSourceArn === latestArn ? 'update' : 'delete';
                    let eventSource = {
                        id: item.UUID,
                        arn: item.EventSourceArn,
                        action: action
                    };
                    eventSources.push(eventSource);
                });
                if (!foundLatestArn) {
                    eventSources.push({ arn: latestArn, action: 'create' });
                }

                return resolve(eventSources);
            });
        });
    }

    createEventSource(streamArn) {
        return new Promise((resolve, reject) => {
            let lambda = new AWS.Lambda({ region: this.LambdaRegion });
            let params = {
                EventSourceArn: streamArn,
                FunctionName: this.LambdaName,
                StartingPosition: 'TRIM_HORIZON',
                BatchSize: 100,
                Enabled: true
            };
            lambda.createEventSourceMapping(params, err => {
                if (err) {
                    return reject(err);
                }
                return resolve();
            });
        });
    }

    updateEventSource(id) {
        return new Promise((resolve, reject) => {
            let lambda = new AWS.Lambda({ region: this.LambdaRegion });
            let params = {
                UUID: id,
                BatchSize: 100,
                Enabled: true,
                FunctionName: this.LambdaName
            };
            lambda.updateEventSourceMapping(params, err => {
                if (err) {
                    return reject(err);
                }
                return resolve();
            });
        });
    }

    deleteEventSource(id) {
        return new Promise((resolve, reject) => {
            let lambda = new AWS.Lambda({ region: this.LambdaRegion });
            let params = {
                UUID: id
            };
            lambda.deleteEventSourceMapping(params, err => {
                if (err) {
                    return reject(err);
                }
                return resolve();
            });
        });
    }

    setParams() {
        return new Promise((resolve, reject) => {
            let config = {
                S3Bucket: this.S3Bucket,
                S3Region: this.S3Region,
                S3Prefix: this.S3Prefix
            };
            let data = JSON.stringify(config, null, 2);
            fs.writeFile('./lambda/config.json', data, err => {
                if (err) {
                    return reject(err);
                }

                return resolve();
            });
        });
    }
}

module.exports = LambdaInfrastructure;
