module.exports = {
    'env': {
        'node': true,
        'es6': true
    },
    'extends': 'eslint:recommended',
    'parserOptions': {
        'ecmaVersion': 2018,
        'sourceType': 'module'
    },
    'rules': {
        'indent': [
            'error',
            4
        ],
        'linebreak-style': [
            'error',
            'unix'
        ],
        'quotes': [
            'error',
            'single'
        ],
        'semi': [
            'error',
            'always'
        ],
        'no-unused-vars': [
            'warn',
            {
                'argsIgnorePattern': '^_'
            }
        ],
        'no-console': 'off',
        'no-trailing-spaces': 'error',
        'eol-last': 'error',
        'comma-dangle': [
            'error',
            'never'
        ],
        'object-curly-spacing': [
            'error',
            'never'
        ],
        'array-bracket-spacing': [
            'error',
            'never'
        ],
        'space-before-function-paren': [
            'error',
            {
                'anonymous': 'always',
                'named': 'never',
                'asyncArrow': 'always'
            }
        ],
        'keyword-spacing': 'error',
        'space-infix-ops': 'error',
        'brace-style': [
            'error',
            '1tbs',
            {
                'allowSingleLine': true
            }
        ]
    }
};

