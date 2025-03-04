#!/usr/bin/env node

const { PlaybookLoader } = require('../scripts/global-playbook-loader');

new PlaybookLoader()
	.loadPlaybook()
	.then(() => console.debug('Playbook successfully loaded!'));
