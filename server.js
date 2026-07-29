/**
 * Startup file for cPanel "Setup Node.js App" (Phusion Passenger).
 *
 * Passenger boots a single file instead of running `npm start`, so this wraps
 * the built Next.js app in a plain HTTP server. Run `npm run build` before
 * starting — this only serves what the build produced.
 */
const { createServer } = require('http')
const next = require('next')

const port = process.env.PORT || 3300
const app = next({ dev: false, dir: __dirname })
const handle = app.getRequestHandler()

app
  .prepare()
  .then(() => {
    createServer((req, res) => handle(req, res)).listen(port, () => {
      console.log(`TrustIndex ready on port ${port}`)
    })
  })
  .catch((err) => {
    console.error('Failed to start Next.js', err)
    process.exit(1)
  })
