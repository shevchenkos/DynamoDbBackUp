'use strict';

/**
 * Validates AWS region format
 * @param {string} region - AWS region string
 * @returns {boolean} - True if valid
 */
function isValidRegion(region) {
    if (!region || typeof region !== 'string') {
        return false;
    }
    // AWS region pattern: us-east-1, eu-west-1, etc.
    const regionPattern = /^[a-z]{2}-[a-z]+-\d+$/;
    return regionPattern.test(region);
}

/**
 * Validates S3 bucket name format
 * @param {string} bucketName - S3 bucket name
 * @returns {boolean} - True if valid
 */
function isValidBucketName(bucketName) {
    if (!bucketName || typeof bucketName !== 'string') {
        return false;
    }
    // S3 bucket name rules: 3-63 chars, lowercase, numbers, dots, hyphens
    const bucketPattern = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/;
    return bucketName.length >= 3 && bucketName.length <= 63 && bucketPattern.test(bucketName);
}

/**
 * Validates DynamoDB table name format
 * @param {string} tableName - DynamoDB table name
 * @returns {boolean} - True if valid
 */
function isValidTableName(tableName) {
    if (!tableName || typeof tableName !== 'string') {
        return false;
    }
    // DynamoDB table name: 1-255 chars, alphanumeric, underscores, hyphens, dots
    const tablePattern = /^[a-zA-Z0-9_.-]+$/;
    return tableName.length >= 1 && tableName.length <= 255 && tablePattern.test(tableName);
}

/**
 * Validates backup configuration
 * @param {object} config - Configuration object
 * @param {Array<string>} requiredFields - Array of required field names
 * @returns {object} - { valid: boolean, errors: Array<string> }
 */
function validateBackupConfig(config, requiredFields) {
    const errors = [];

    if (!config || typeof config !== 'object') {
        errors.push('Config must be an object');
        return { valid: false, errors };
    }

    // Check required fields
    requiredFields.forEach(field => {
        if (!config[field] || (typeof config[field] === 'string' && config[field].trim() === '')) {
            errors.push(`Missing required field: ${field}`);
        }
    });

    // Validate S3Bucket
    if (config.S3Bucket && !isValidBucketName(config.S3Bucket)) {
        errors.push(`Invalid S3Bucket name: ${config.S3Bucket}`);
    }

    // Validate S3Region
    if (config.S3Region && !isValidRegion(config.S3Region)) {
        errors.push(`Invalid S3Region: ${config.S3Region}`);
    }

    // Validate DbTable
    if (config.DbTable && !isValidTableName(config.DbTable)) {
        errors.push(`Invalid DbTable name: ${config.DbTable}`);
    }

    // Validate DbRegion
    if (config.DbRegion && !isValidRegion(config.DbRegion)) {
        errors.push(`Invalid DbRegion: ${config.DbRegion}`);
    }

    // Validate S3Encryption if provided
    if (config.S3Encryption && !['AES256', 'aws:kms'].includes(config.S3Encryption)) {
        errors.push(`Invalid S3Encryption: ${config.S3Encryption}. Must be 'AES256' or 'aws:kms'`);
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Validates restore configuration
 * @param {object} config - Configuration object
 * @returns {object} - { valid: boolean, errors: Array<string> }
 */
function validateRestoreConfig(config) {
    const requiredFields = ['S3Bucket', 'S3Region', 'DbTable', 'DbRegion'];
    return validateBackupConfig(config, requiredFields);
}

/**
 * Validates deploy configuration
 * @param {object} config - Configuration object
 * @param {string} type - Type of deployment: 's3', 'lambda', 'lambdaEvent'
 * @returns {object} - { valid: boolean, errors: Array<string> }
 */
function validateDeployConfig(config, type) {
    const errors = [];

    if (!config || typeof config !== 'object') {
        errors.push('Config must be an object');
        return { valid: false, errors };
    }

    if (type === 's3') {
        const requiredFields = ['S3Bucket', 'S3Region'];
        requiredFields.forEach(field => {
            if (!config[field] || (typeof config[field] === 'string' && config[field].trim() === '')) {
                errors.push(`Missing required field: ${field}`);
            }
        });
        if (config.S3Bucket && !isValidBucketName(config.S3Bucket)) {
            errors.push(`Invalid S3Bucket name: ${config.S3Bucket}`);
        }
        if (config.S3Region && !isValidRegion(config.S3Region)) {
            errors.push(`Invalid S3Region: ${config.S3Region}`);
        }
    } else if (type === 'lambda') {
        const requiredFields = ['S3Bucket', 'S3Region', 'DbRegion', 'LambdaName', 'LambdaRegion', 'LambdaAlias', 'LambdaRoleName'];
        requiredFields.forEach(field => {
            if (!config[field] || (typeof config[field] === 'string' && config[field].trim() === '')) {
                errors.push(`Missing required field: ${field}`);
            }
        });
        if (config.S3Bucket && !isValidBucketName(config.S3Bucket)) {
            errors.push(`Invalid S3Bucket name: ${config.S3Bucket}`);
        }
        if (config.S3Region && !isValidRegion(config.S3Region)) {
            errors.push(`Invalid S3Region: ${config.S3Region}`);
        }
        if (config.LambdaRegion && !isValidRegion(config.LambdaRegion)) {
            errors.push(`Invalid LambdaRegion: ${config.LambdaRegion}`);
        }
        if (config.DbRegion && !isValidRegion(config.DbRegion)) {
            errors.push(`Invalid DbRegion: ${config.DbRegion}`);
        }
    } else if (type === 'lambdaEvent') {
        const requiredFields = ['DbTable', 'DbRegion', 'LambdaName', 'LambdaRegion', 'LambdaAlias'];
        requiredFields.forEach(field => {
            if (!config[field] || (typeof config[field] === 'string' && config[field].trim() === '')) {
                errors.push(`Missing required field: ${field}`);
            }
        });
        if (config.DbTable && !isValidTableName(config.DbTable)) {
            errors.push(`Invalid DbTable name: ${config.DbTable}`);
        }
        if (config.DbRegion && !isValidRegion(config.DbRegion)) {
            errors.push(`Invalid DbRegion: ${config.DbRegion}`);
        }
        if (config.LambdaRegion && !isValidRegion(config.LambdaRegion)) {
            errors.push(`Invalid LambdaRegion: ${config.LambdaRegion}`);
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

module.exports = {
    validateBackupConfig,
    validateRestoreConfig,
    validateDeployConfig,
    isValidRegion,
    isValidBucketName,
    isValidTableName
};

