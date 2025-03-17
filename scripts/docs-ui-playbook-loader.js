const { parseArgs} = require('node:util');
const { PlaybookLoaderUtils } = require('./playbook-loader-utils');


class DocsUIPlaybookLoader {
	static INPUT_ARGS_OPTIONS = {
		'bundle-path': {
			type: 'string',
			default: './build/ui-bundle.zip',
		},
		'log-level': {
			type: 'string',
			default: 'log', // 'log' | 'debug'
		},
	};
	async loadPlaybook() {
		const {
			values: argValues,
		} = parseArgs({ options: DocsUIPlaybookLoader.INPUT_ARGS_OPTIONS });

		const logLevel = argValues['log-level'];
		PlaybookLoaderUtils.setLogLevel(logLevel);

		const localAntoraPlaybook = { ui: { bundle: { url: argValues['bundle-path'] } } };
		const globalAntoraPlaybook = await PlaybookLoaderUtils.fetchGlobalAntoraPlaybook();
		const contentSources = PlaybookLoaderUtils.replaceCurrentRepoWithHazelcastDocsUrl(globalAntoraPlaybook.content.sources);
		const playbook = PlaybookLoaderUtils.mergePlaybooks(globalAntoraPlaybook, localAntoraPlaybook, contentSources);
		PlaybookLoaderUtils.writeGlobalAntoraPlaybookFile(playbook);
	}
}

module.exports = { DocsUIPlaybookLoader };
