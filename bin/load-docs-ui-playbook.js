#!/usr/bin/env node
const { DocsUIPlaybookLoader } = require('../scripts/docs-ui-playbook-loader');
new DocsUIPlaybookLoader()
	.loadPlaybook()
	.then(() => console.debug('Docs UI playbook successfully loaded!'));
