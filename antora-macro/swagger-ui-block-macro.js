/**
 * Extends the AsciiDoc syntax to support SwaggerUI pages. The Swagger docs are inserted using redoc
 *
 * Usage:
 *
 * swagger_ui::{attachmentsdir}/rest-client-api.yaml[]
 */

const buildSwaggerUi = ({ specUrl }) => `
<link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
<redoc spec-url='${specUrl}'></redoc>
<script src="https://cdn.jsdelivr.net/npm/redoc@latest/bundles/redoc.standalone.js"> </script>`

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
