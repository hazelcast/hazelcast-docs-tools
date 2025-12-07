/**
 * Extends the AsciiDoc syntax to support SwaggerUI pages. The Swagger docs are inserted using redoc
 *
 * Usage:
 *
 * swagger_ui::{attachmentsdir}/rest-client-api.yaml[]
 */

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
      const contentScripts = buildSwaggerUi({ specUrl })
      return this.createBlock(parent, 'pass', contentScripts)
    })
  }
}

function register (registry, context) {
  registry.blockMacro('swagger_ui', blockSwaggerUiMacro(context))
}

module.exports.register = register
