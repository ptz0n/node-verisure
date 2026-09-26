/* eslint-disable max-classes-per-file -- two small, tightly related error types */

// Body/message markers Verisure's API uses to signal a rate/quota limit, even
// when the HTTP status code alone doesn't say so (e.g. a 200 wrapping a
// GraphQL error, or a vaguely worded 4xx). Learned from production traffic by
// other Verisure client libraries (e.g. python-verisure).
const RATE_LIMIT_MARKERS = [
  'aut_00021',
  'acc_00002',
  'toomanystepuptokens',
  'too many step up tokens',
  'request limit',
  'rate limit',
  'too many requests',
];

const containsRateLimitMarker = (text) => {
  if (!text) {
    return false;
  }
  return RATE_LIMIT_MARKERS.some((marker) => String(text).toLowerCase().includes(marker));
};

class GraphqlError extends Error {
  constructor(errors) {
    super();
    this.name = 'GraphqlException';
    this.message = `GraphQL response contains ${errors.length} errors`;
    this.errors = errors;
    this.isRateLimited = errors
      .some(({ message, data }) => containsRateLimitMarker(message)
        || (data && containsRateLimitMarker(data.errorCode)));
  }
}

class HttpError extends Error {
  constructor(status, data) {
    super(`Request failed with status code ${status}`);
    this.name = 'HttpException';
    this.response = { status, data };
    this.isRateLimited = status === 429
      || containsRateLimitMarker(typeof data === 'string' ? data : JSON.stringify(data || ''));
  }
}

module.exports = {
  GraphqlError,
  HttpError,
  containsRateLimitMarker,
};
