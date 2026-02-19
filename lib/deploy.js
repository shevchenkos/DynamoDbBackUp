'use strict';

const DynamoInfrastructure = require('./bin/infrastructure/dynamo');
const LambdaInfrastructure = require('./bin/infrastructure/lambda');
const S3Infrastructure = require('./bin/infrastructure/s3');
const { validateDeployConfig } = require('./bin/validation');

/**
 * Deploy class for setting up AWS infrastructure for DynamoDB backups
 * Handles S3 bucket creation, Lambda function deployment, and event source mapping
 */
class Deploy {
    /**
     * Creates a new Deploy instance
     * @param {object} config - Configuration object (varies by deployment type)
     */
    constructor(config) {
        this.config = config;
        this.dynamoInfrastructure = new DynamoInfrastructure(config);
        this.lambdaInfrastructure = new LambdaInfrastructure(config);
        this.s3Infrastructure = new S3Infrastructure(config);
    }

    /**
     * Creates and configures an S3 bucket for backups
     * Enables versioning and sets up bucket policies
     * @returns {Promise} Promise that resolves when bucket is configured
     */
    backupBucket() {
        const validation = validateDeployConfig(this.config, 's3');
        if (!validation.valid) {
            return Promise.reject(new Error(`Invalid deploy configuration: ${validation.errors.join(', ')}`));
        }
        return this.s3Infrastructure.createAndConfigure()
            .catch(err => {
                throw err;
            });
    }

    /**
     * Deploys a Lambda function for incremental backups
     * Installs packages, creates/updates IAM role, and deploys function code
     * @returns {Promise} Promise that resolves when Lambda is deployed
     */
    lambda() {
        const validation = validateDeployConfig(this.config, 'lambda');
        if (!validation.valid) {
            return Promise.reject(new Error(`Invalid deploy configuration: ${validation.errors.join(', ')}`));
        }
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

    /**
     * Configures DynamoDB Stream as event source for Lambda function
     * Enables stream on table if not already enabled
     * @returns {Promise} Promise that resolves when event source is configured
     */
    lambdaEvent() {
        const validation = validateDeployConfig(this.config, 'lambdaEvent');
        if (!validation.valid) {
            return Promise.reject(new Error(`Invalid deploy configuration: ${validation.errors.join(', ')}`));
        }
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
