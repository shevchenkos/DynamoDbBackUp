'use strict';

/**
 * Retries a function with exponential backoff
 * @param {Function} fn - Function to retry (should return a Promise)
 * @param {object} options - Retry options
 * @param {number} [options.maxRetries=3] - Maximum number of retry attempts
 * @param {number} [options.initialDelay=1000] - Initial delay in milliseconds
 * @param {number} [options.maxDelay=10000] - Maximum delay in milliseconds
 * @param {Function} [options.shouldRetry] - Function to determine if error should be retried
 * @returns {Promise} Promise that resolves/rejects based on function result
 */
function retryWithBackoff(fn, options = {}) {
    const {
        maxRetries = 3,
        initialDelay = 1000,
        maxDelay = 10000,
        shouldRetry = defaultShouldRetry
    } = options;

    let attempt = 0;

    function execute() {
        return fn().catch(err => {
            if (attempt >= maxRetries || !shouldRetry(err)) {
                throw err;
            }

            attempt++;
            const delay = Math.min(
                initialDelay * Math.pow(2, attempt - 1),
                maxDelay
            );

            return new Promise(resolve => {
                setTimeout(() => {
                    resolve(execute());
                }, delay);
            });
        });
    }

    return execute();
}

/**
 * Default function to determine if an error should be retried
 * Retries on network errors, throttling, and service unavailability
 * @param {Error} err - Error object
 * @returns {boolean} True if error should be retried
 */
function defaultShouldRetry(err) {
    if (!err) {
        return false;
    }

    // AWS SDK v2 error structure
    const code = err.code || err.statusCode;
    const message = (err.message || '').toLowerCase();

    // Retry on throttling errors
    if (code === 'ThrottlingException' ||
        code === 'ProvisionedThroughputExceededException' ||
        code === 'RequestLimitExceeded' ||
        message.includes('throttl')) {
        return true;
    }

    // Retry on service errors
    if (code === 'ServiceUnavailable' ||
        code === 'InternalServerError' ||
        code === 503 ||
        code === 500) {
        return true;
    }

    // Retry on network errors
    if (code === 'ECONNRESET' ||
        code === 'ETIMEDOUT' ||
        code === 'ENOTFOUND' ||
        code === 'ECONNREFUSED' ||
        message.includes('timeout') ||
        message.includes('network')) {
        return true;
    }

    return false;
}

/**
 * Wraps an AWS SDK callback-style function with retry logic
 * @param {Function} awsFunction - AWS SDK function
 * @param {object} params - Parameters for AWS function
 * @param {object} [retryOptions] - Retry options
 * @returns {Promise} Promise that resolves with AWS response
 */
function retryAwsCall(awsFunction, params, retryOptions) {
    return retryWithBackoff(() => {
        return new Promise((resolve, reject) => {
            awsFunction(params, (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    }, retryOptions);
}

module.exports = {
    retryWithBackoff,
    retryAwsCall,
    defaultShouldRetry
};

