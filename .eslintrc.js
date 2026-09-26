module.exports = {
  extends: 'airbnb-base',
  plugins: ['jest'],
  env: {
    node: true,
    'jest/globals': true,
  },
  rules: {
    'comma-dangle': ['error', {
      arrays: 'always-multiline',
      objects: 'always-multiline',
      imports: 'always-multiline',
      exports: 'always-multiline',
      functions: 'never',
    }],
  },
};
