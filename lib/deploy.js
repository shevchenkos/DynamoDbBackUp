'use strict';

const DynamoInfrastructure = require('./bin/infrastructure/dynamo');
const LambdaInfrastructure = require('./bin/infrastructure/lambda');
const S3Infrastructure = require('./bin/infrastructure/s3');


class Deploy {
    constructor(config) {
        this.dynamoInfrastructure = new DynamoInfrastructure(config);
        this.lambdaInfrastructure = new LambdaInfrastructure(config);
        this.s3Infrastructure = new S3Infrastructure(config);
    }

    backupBucket() {
        return this.s3Infrastructure.createAndConfigure()
            .catch(err => {
                throw err;
            });
    }

    lambda() {
        return this.lambdaInfrastructure.installPackages()
            .then(() => {
                return this.lambdaInfrastructure.setParams();
            })
            .then(() => {
                return this.lambdaInfrastructure.configureRole()
            })
            .then(roleArn => {
                return this.lambdaInfrastructure.deploy(roleArn)
            })
            .then(() => {
                return this.lambdaInfrastructure.configure()
            })
            .catch(err => {
                throw err;
            });
    }

    lambdaEvent() {
        return this.dynamoInfrastructure.getStreamArn()
            .then(streamArn => {
                return this.lambdaInfrastructure.setEventSource(streamArn)
            })
            .catch(err => {
                throw err;
            });
    }
}

module.exports = Deploy;
