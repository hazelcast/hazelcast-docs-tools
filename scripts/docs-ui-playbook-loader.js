const { parseArgs} = require('node:util');
const { PlaybookLoaderUtils } = require('./playbook-loader-utils');


class DocsUIPlaybookLoader {
	static INPUT_ARGS_OPTIONS = {
		'bundle-path': {
			type: 'string',
			default: './build/ui-bundle.zip',
		},
		'skip-private-repos': {
			type: 'boolean',
			default: false
		},
		'skip-redirects-download': {
			type: 'boolean',
			default: false
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
		const skipPrivateRepos = argValues['skip-private-repos'];
		const skipRedirectsDownload = argValues['skip-redirects-download'];
		const globalAntoraPlaybook = await PlaybookLoaderUtils.fetchGlobalAntoraPlaybook();
		let contentSources = PlaybookLoaderUtils.replaceCurrentRepoWithHazelcastDocsUrl(globalAntoraPlaybook.content.sources);
		if (skipPrivateRepos) {
			contentSources = PlaybookLoaderUtils.removeProtectedSources(contentSources);
		}
		const playbook = PlaybookLoaderUtils.mergePlaybooks(globalAntoraPlaybook, localAntoraPlaybook, contentSources);
		PlaybookLoaderUtils.writeGlobalAntoraPlaybookFile(playbook);
		if (!skipRedirectsDownload) {
			await PlaybookLoaderUtils.downloadGlobalRedirects();
		}
	}
}

module.exports = { DocsUIPlaybookLoader };
