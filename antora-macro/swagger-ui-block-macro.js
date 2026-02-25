/**
 * Extends the AsciiDoc syntax to support SwaggerUI pages. The Swagger docs are inserted using redoc
 *
 * Usage:
 *
 * swagger_ui::{attachmentsdir}/rest-client-api.yaml[]
 * swagger_ui::https://github.com/hazelcast/hazelcast-mono/blob/5.6.z/path/to/api.yaml[]
 */

const https = require('https')
const http = require('http')
const crypto = require('crypto')

// Cache for fetched GitHub files (URL -> content)
const githubCache = new Map()

/**
 * Converts a GitHub blob URL to a raw content URL
 */
function convertToRawUrl(url) {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)/)
  if (match) {
    const [, org, repo, pathWithBranch] = match
    return `https://raw.githubusercontent.com/${org}/${repo}/${pathWithBranch}`
  }
  return url
}

/**
 * Fetches content from a URL synchronously using child_process
 */
function fetchUrlSync(url, token) {
  const { execSync } = require('child_process')

  try {
    const curlCmd = `curl -s -H "Authorization: token ${token}" "${url}"`;

    const content = execSync(curlCmd, {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024 // 10MB max
    })

    return content
  } catch (error) {
    throw new Error(`Failed to fetch ${url}: ${error.message}`)
  }
}

/**
 * Saves fetched YAML as an attachment file in the content catalog
 */
function saveAsAttachment(file, githubUrl, yamlContent) {
  // Generate a stable filename based on the URL
  const hash = crypto.createHash('md5').update(githubUrl).digest('hex').substring(0, 8)
  const originalFilename = githubUrl.split('/').pop().split('?')[0]
  const stem = originalFilename.replace(/\.[^.]+$/, '')
  const ext = originalFilename.match(/\.[^.]+$/)?.[0] || '.yaml'
  const filename = `${stem}-${hash}${ext}`

  // Create a virtual file in the same component's attachments
  const contentCatalog = file.src.origin?.contentCatalog

  if (contentCatalog) {
    const attachmentFile = {
      contents: Buffer.from(yamlContent, 'utf8'),
      src: {
        path: `modules/${file.src.module}/attachments/swagger/${filename}`,
        basename: filename,
        stem: stem,
        extname: ext,
        mediaType: 'text/yaml',
        module: file.src.module,
        family: 'attachment',
        relative: `attachments/swagger/${filename}`,
        component: file.src.component,
        version: file.src.version,
        origin: file.src.origin
      }
    }

    try {
      contentCatalog.addFile(attachmentFile)
      return `../_attachments/swagger/${filename}`
    } catch (error) {
      console.warn(`Could not add attachment file: ${error.message}`)
      return null
    }
  }

  return null
}

const buildSwaggerUi = ({ specUrl }) => `
<redoc
      spec-url='${specUrl}'
      scroll-y-offset="60"
      theme='{
         "spacing": {
           "sectionVertical": "20"
         },
         "typography": {
           "fontFamily": "Open Sans",
           "headings": {
             "fontFamily": "PP Telegraf"
           },
           "code": {
             "fontFamily": "Roboto Mono"
           }
         },
         "rightPanel": {
           "backgroundColor": "#191d29"
         }
       }'
    ></redoc>
    <script src="https://cdn.redoc.ly/redoc/v2.1.4/bundles/redoc.standalone.js"></script>`

function blockSwaggerUiMacro ({ file }) {
  return function () {
    this.process((parent, specUrl) => {
      specUrl = `${specUrl}`

      // Check if it's a GitHub hazelcast URL
      if (specUrl.startsWith('https://github.com/hazelcast')) {
        console.log(`[swagger_ui] Detected GitHub URL: ${specUrl}`)

        // Check cache first
        let yamlContent = githubCache.get(specUrl)

        if (!yamlContent) {
          try {
            const rawUrl = convertToRawUrl(specUrl)
            const githubToken = process.env.GIT_CREDENTIALS

            if (!githubToken) {
              console.warn('[swagger_ui] GIT_CREDENTIALS not set. Private repos may not be accessible.')
            }

            console.log(`[swagger_ui] Fetching from ${rawUrl}...`)
            yamlContent = fetchUrlSync(rawUrl, githubToken)

            // Cache it
            githubCache.set(specUrl, yamlContent)
            console.log(`[swagger_ui] ✓ Fetched ${yamlContent.length} bytes`)
          } catch (error) {
            console.error(`[swagger_ui] Failed to fetch ${specUrl}: ${error.message}`)
            console.error('[swagger_ui] Falling back to original URL (may not work in browser)')
            // Fall through to use original URL
          }
        }

        // Try to save as attachment and get local path
        if (yamlContent) {
          const localPath = saveAsAttachment(file, specUrl, yamlContent)
          if (localPath) {
            console.log(`[swagger_ui] Saved as attachment: ${localPath}`)
            specUrl = localPath
          }
        }
      }

      const contentScripts = buildSwaggerUi({ specUrl })
      return this.createBlock(parent, 'pass', contentScripts)
    })
  }
}

function register (registry, context) {
  registry.blockMacro('swagger_ui', blockSwaggerUiMacro(context))
}

module.exports.register = register
