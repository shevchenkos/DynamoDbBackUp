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
        this.LambdaMemorySize = config.LambdaMemorySize;
        this.LambdaTimeout = config.LambdaTimeout;
        this.S3Bucket = config.S3Bucket;
        this.S3Prefix = config.S3Prefix;
        this.S3Region = config.S3Region;
        this.DbRegion = config.DbRegion;

        //package root dir
        this.curDir = path.join(__dirname, './../../../');
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
        console.time('Get Lambda Role');
        return new Promise(resolve => {
            let iam = new AWS.IAM();
            let params = {
                RoleName: this.LambdaRoleName
            };
            iam.getRole(params, (err, data) => {
                console.timeEnd('Get Lambda Role');
                if (err) {
                    return resolve({ IsExists: false });
                }
                return resolve({ IsExists: true, Arn: data.Role.Arn });
            });
        });
    }

    createRole() {
        console.time('Create Lambda Role');
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
                console.timeEnd('Create Lambda Role');
                if (err) {
                    return reject(err);
                }
                return resolve(data.Role.Arn);
            });
        });
    }

    createPolicy(role) {
        console.time('Create Lambda Policy');
        return new Promise((resolve, reject) => {
            let iam = new AWS.IAM();
            let policyDocument = {
                "Statement": [
                    {
                        "Resource": [
                            util.format("arn:aws:logs:%s:*:*", this.LambdaRegion),
                            util.format("arn:aws:dynamodb:%s:*:table/*", this.DbRegion),
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
                console.timeEnd('Create Lambda Policy');
                if (err) {
                    return reject(err);
                }
                return resolve(role);
            });
        });
    }

    installPackages() {
        console.time('Install Lambda Packages');
        return new Promise((resolve, reject) => {
            exec('cd ' + this.curDir + 'lambda && npm i', function (err, stdout, stderr) {
                console.timeEnd('Install Lambda Packages');
                if (err) {
                    return reject(err);
                }
                return resolve();
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
        console.time('Create Lambda Code Archive');
        let _this = this;
        let zip = new Zip();
        return new Promise((resolve, reject) => {
            fse.walk(this.curDir + 'lambda')
                .on('data', item => {
                    let symbolicLink = item.stats.isSymbolicLink() && fs.existsSync(item.path);
                    if (item.stats.isFile() || symbolicLink) {
                        let name = path.relative(this.curDir + 'lambda', item.path);
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
                if (!fs.existsSync(this.curDir + 'dist')) {
                    fs.mkdirSync(this.curDir + 'dist');
                }
                _this.pathCompressed = path.join(this.curDir + 'dist', _this.zipName);
                fs.writeFileSync(_this.pathCompressed, _this.zipBuffer);
                console.timeEnd('Create Lambda Code Archive');
            });
    }

    isFunctionExists() {
        console.time('Check if Lambda Exists');
        return new Promise(resolve => {
            let lambda = new AWS.Lambda({ region: this.LambdaRegion });
            let params = {
                FunctionName: this.LambdaName
            };
            lambda.getFunction(params, err => {
                console.timeEnd('Check if Lambda Exists');
                return resolve(!err);
            });
        });
    }

    create(roleArn) {
        console.log(roleArn);
        console.time('Create Lambda Function');
        return new Promise((resolve, reject) => {
            let lambda = new AWS.Lambda({ region: this.LambdaRegion });
            let params = {
                Code: {
                    ZipFile: this.zipBuffer
                },
                FunctionName: this.LambdaName,
                Handler: 'index.handler',
                Role: roleArn,
                Runtime: 'nodejs10.x',
                Description: 'Backup Lambda',
                MemorySize: this.LambdaMemorySize,
                Timeout: this.LambdaTimeout
            };
            lambda.createFunction(params, err => {
                console.timeEnd('Create Lambda Function');
                if (err) {
                    return reject(err);
                }
                return resolve();
            });
        });
    }

    updateConfiguration(roleArn) {
        console.time('Update Lambda Configuration');
        return new Promise((resolve, reject) => {
            let lambda = new AWS.Lambda({ region: this.LambdaRegion });
            let params = {
                FunctionName: this.LambdaName,
                Handler: 'index.handler',
                Role: roleArn,
                Description: 'Backup Lambda',
                MemorySize: this.LambdaMemorySize,
                Timeout: this.LambdaTimeout
            };
            lambda.updateFunctionConfiguration(params, err => {
                console.timeEnd('Update Lambda Configuration');
                if (err) {
                    return reject(err);
                }
                return resolve();
            });
        });
    }

    updateCode() {
        console.time('Update Lambda Code');
        return new Promise((resolve, reject) => {
            let lambda = new AWS.Lambda({ region: this.LambdaRegion });
            let params = {
                FunctionName: this.LambdaName,
                ZipFile: this.zipBuffer
            };
            lambda.updateFunctionCode(params, err => {
                console.timeEnd('Update Lambda Code');
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
        console.time('Publish Lambda Version');
        return new Promise((resolve, reject) => {
            let lambda = new AWS.Lambda({ region: this.LambdaRegion });
            let params = {
                FunctionName: this.LambdaName
            };
            lambda.publishVersion(params, (err, data) => {
                console.timeEnd('Publish Lambda Version');
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
        console.time('Get Lambda Alias');
        return new Promise(resolve => {
            let lambda = new AWS.Lambda({ region: this.LambdaRegion });
            let params = {
                FunctionName: this.LambdaName,
                Name: this.LambdaAlias
            };
            lambda.getAlias(params, err => {
                console.timeEnd('Get Lambda Alias');
                lParams.isAliasExists = !err;
                return resolve(lParams);
            });
        });
    }

    updateAlias(lParams) {
        console.time('Update Lambda Alias');
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
                    console.timeEnd('Update Lambda Alias');
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
                    console.timeEnd('Update Lambda Alias');
                    if (err) {
                        return reject(err);
                    }
                    return resolve();
                });
            }
        });
    }

    setEventSource(streamArn) {
        return this.getLambdaArn()
            .then(lambdaArn => {
                return this.getEventSources(lambdaArn, streamArn)
            })
            .then(eventSources => {
                return this.processEventSources(eventSources);
            })
            .catch(err => {
                throw err;
            });
    }

    processEventSources(eventSources) {
        console.time('Update Lambda Event Sources');
        let promises = [];
        eventSources.forEach(eventSource => {
            if (eventSource.action === 'create') {
                promises.push(this.createEventSource(eventSource.lambdaArn, eventSource.arn));
            }
            if (eventSource.action === 'update') {
                promises.push(this.updateEventSource(eventSource.lambdaArn, eventSource.id));
            }
            if (eventSource.action === 'delete') {
                promises.push(this.deleteEventSource(eventSource.id));
            }
        });
        console.timeEnd('Update Lambda Event Sources');
        return Promise.all(promises);
    }

    getLambdaArn() {
        console.time('Get Lambda ARN');
        return new Promise((resolve, reject) => {
            let lambda = new AWS.Lambda({ region: this.LambdaRegion });
            let params = {
                FunctionName: this.LambdaName
            };
            lambda.getFunction(params, (err, data) => {
                console.timeEnd('Get Lambda ARN');
                if (err) {
                    return reject(err);
                }
                return resolve(data.Configuration.FunctionArn + ':' + this.LambdaAlias);
            });
        });
    }

    getEventSources(lambdaArn, latestArn) {
        console.time('Get Lambda Event Sources');
        return new Promise((resolve, reject) => {
            let lambda = new AWS.Lambda({ region: this.LambdaRegion });
            let params = {
                FunctionName: lambdaArn
            };
            lambda.listEventSourceMappings(params, (err, data) => {
                console.timeEnd('Get Lambda Event Sources');
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
                        action: action,
                        lambdaArn: lambdaArn
                    };
                    eventSources.push(eventSource);
                });
                if (!foundLatestArn) {
                    eventSources.push({ arn: latestArn, action: 'create', lambdaArn: lambdaArn });
                }

                return resolve(eventSources);
            });
        });
    }

    createEventSource(lambdaArn, streamArn) {
        return new Promise((resolve, reject) => {
            let lambda = new AWS.Lambda({ region: this.LambdaRegion });
            let params = {
                EventSourceArn: streamArn,
                FunctionName: lambdaArn,
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

    updateEventSource(lambdaArn, id) {
        return new Promise((resolve, reject) => {
            let lambda = new AWS.Lambda({ region: this.LambdaRegion });
            let params = {
                UUID: id,
                BatchSize: 100,
                Enabled: true,
                FunctionName: lambdaArn
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
        console.time('Set Lambda Params');
        return new Promise((resolve, reject) => {
            let config = {
                S3Bucket: this.S3Bucket,
                S3Region: this.S3Region,
                S3Prefix: this.S3Prefix
            };
            let data = JSON.stringify(config, null, 2);
            fs.writeFile(this.curDir + 'lambda/config.json', data, err => {
                console.timeEnd('Set Lambda Params');
                if (err) {
                    return reject(err);
                }
                return resolve();
            });
        });
    }
}

module.exports = LambdaInfrastructure;
