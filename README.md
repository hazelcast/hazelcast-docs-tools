## Description
Various tools and helpers to build documentation site

## Structure
| Folder            | Description                                                                                    |
|-------------------|------------------------------------------------------------------------------------------------|
| antora-extensions | [extensions](https://docs.antora.org/antora/latest/extend/extensions/) for antora site builder |
| antora-macro      | [macro](https://docs.antora.org/antora/latest/asciidoc/ui-macros/) for antora site builder     |
| scripts           | various scripts for file processing                                                            |
| bin               | executables                                                                                    |

## Installation
Right now we only support direct [npm package installation](https://docs.npmjs.com/cli/commands/npm-install) from GitHub, e.g.

```npm
 npm i -D hazelcast/hazelcast-docs-tools#v0.0.1-alpha
```

The part after `#` is the version of the package, e.g. `#v0.0.1-alpha`.

## Usage

### Extensions and Macro

All files inside `antora-extensions` and `antora-macro` folders can be used as antora extensions, e.g. in the `antora-playbook.yaml` file.

```yaml
  extensions:
    - ./node_modules/hazelcast-docs-tools/antora-macro/tabs-block.js
    - ./node_modules/hazelcast-docs-tools/antora-extensions/api-json.js
```

### Scripts
Scripts can be used by requiring them as Node modules. E.g.

```javascript
require('hazelcast-docs-tools/scripts/orphan-pages-checker');
```

### Executables
Executables are installed inside the `node_modules/.bin`, so they can be called directly e.g. in npm scripts:

```json
"check-orphan-pages": "check-orphan-pages",
```

## Tools
| File                                | Type              | Description                                                                                                                                                                                                                     | 
|-------------------------------------|-------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `load-check-links-playbook.js`      | script            | Creates a special Antora Playbook from the global [`antora-playbook.yml`](https://github.com/hazelcast/hazelcast-docs/blob/main/antora-playbook.yml) suitable for running the docs validation                                   |
| `orphan-pages-checker.js`           | executable/script | Checks the whether the current docs pages folders contain the pages which are not mentioned in the navigation. Takes one optional parameter `--directory` or '-d` to set the root folder of documentation, default value `docs` |
| `tabs-block.js`                     | macros            | Extends the AsciiDoc syntax to support a tabset                                                                                                                                                                                 |
| `swagger-ui-block-macro.js`         | macros            | Adds support for `swagger_ui::{LINK_TO_SWAGGER_YAML}`                                                                                                                                                                           |
| `api-json.js`                       | extension         | Adds possibility to get docs or other data as JSON response via HTTP requests                                                                                                                                                   |
| `antora-link-checker-extension.js`  | extension         | Stops Antora builder earlier to save time for validation run                                                                                                                                                                    |

## Release Process
The release process is powered by [`npm` CLI](https://docs.npmjs.com/updating-your-published-package-version-number).

1. Switch to the `main` branch, fetch, commit and push the latest changes.
2. Run in the console `npm version [patch|minor|major]`. Note the version output in the console after you run the latter command - it will be the new version.
3. Go to [releases](https://github.com/hazelcast/hazelcast-docs-tools/releases/new) and create a new release with the latest tag (appeared after step 2). Don't forget to check "Set as the latest release".

To use that release clients need to reinstall the package with the new version, e.g. for the version `v1.2.3` run `npm i -D hazelcast/hazelcast-docs-tools#v1.2.3`
