// Vercel serverless entry point. Vercel runs functions in `api/`; this exports
// the full Express app as the handler. `vercel.json` rewrites every path here,
// so all /v1/* routes work exactly as they do on a normal server.
module.exports = require('../src/index.js');
