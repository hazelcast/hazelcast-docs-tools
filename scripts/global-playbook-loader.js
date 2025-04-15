const { parseArgs} = require('node:util');
const { PlaybookLoaderUtils } = require('./playbook-loader-utils');


class PlaybookLoader {
	static INPUT_ARGS_OPTIONS = {
		repo: {
			type: 'string',
			short: 'r',
		},
		branch: {
			type: 'string',
			short: 'b',
		},
		'log-level': {
			type: 'string',
			default: 'log', // 'log' | 'debug'
		},
		'skip-private-repos': {
			type: 'boolean',
			default: false
		},
		'skip-redirects-download': {
			type: 'boolean',
			default: false
		},
		// use only global content sources even if local content sources are present
		// e.g. for links-checker we should always check in the context of global sources
		'enforce-global-sources': {
			type: 'boolean',
			default: false
		},
	};
	static async getGitData(argValues) {
		let currentRepoName = argValues.repo;
		let baseBranchName = argValues.branch;
		if (process.env.NETLIFY === 'true') {
			currentRepoName = process.env.REPOSITORY_URL?.replace('https://github.com/', '');
			// for production build process.env.BRANCH === "branch_name", for a preview build process.env.BRANCH === "pull/{PR_ID}/head"
			baseBranchName = process.env.PULL_REQUEST === 'true' ? await PlaybookLoader.getBranchNameFromPrId(currentRepoName) : process.env.BRANCH;
		}

		// check whether there are arguments after the filename
		if (!currentRepoName || !baseBranchName) {
			throw new Error('`repo` and `branch` must be specified!');
		}

		console.debug('Repository name: ', currentRepoName);
		console.debug('Base branch: ', baseBranchName);

		return { currentRepoName, baseBranchName };
	}

	static async getBranchNameFromPrId(repoName) {
		const prId = process.env.BRANCH?.replace('pull/', '').replace('/head', '');
		const response = await fetch(`https://api.github.com/repos/${repoName}/pulls/${prId}`);
		const prData = await response.json();
		return prData.base.ref;
	}

	async loadPlaybook() {
		const { skipPrivateRepos, skipRedirectsDownload } = await this.parseInputArgs();

		const localAntoraPlaybook = await PlaybookLoaderUtils.loadLocalAntoraData();
		const globalAntoraPlaybook = await PlaybookLoaderUtils.fetchGlobalAntoraPlaybook();
		let { contentSources } = this.loadContentSources(globalAntoraPlaybook, localAntoraPlaybook, skipPrivateRepos);
		const playbook = PlaybookLoaderUtils.mergePlaybooks(globalAntoraPlaybook, localAntoraPlaybook, contentSources);
		PlaybookLoaderUtils.writeGlobalAntoraPlaybookFile(playbook);
		if (!skipRedirectsDownload) {
			await PlaybookLoaderUtils.downloadGlobalRedirects();
		}
	}

	async parseInputArgs() {
		const {
			values: argValues,
		} = parseArgs({ options: PlaybookLoader.INPUT_ARGS_OPTIONS });

		const { currentRepoName, baseBranchName } = await PlaybookLoader.getGitData(argValues);
		const skipPrivateRepos = argValues['skip-private-repos'];
		const enforceGlobalSources = argValues['enforce-global-sources'];
		const skipRedirectsDownload = argValues['skip-redirects-download'];

		const logLevel = argValues['log-level'];
		PlaybookLoaderUtils.setLogLevel(logLevel);

		this.currentRepoName = currentRepoName;
		this.baseBranchName = baseBranchName;
		this.logLevel = logLevel;
		this.skipPrivateRepos = skipPrivateRepos;
		this.enforceGlobalSources = enforceGlobalSources;
		return { currentRepoName, baseBranchName, logLevel, skipPrivateRepos, enforceGlobalSources, skipRedirectsDownload };
	}

	loadContentSources(globalAntoraPlaybook, localAntoraPlaybook, skipPrivateRepos) {
		let contentSources = localAntoraPlaybook.content?.sources;
		if (this.enforceGlobalSources || !contentSources) {
			contentSources = globalAntoraPlaybook.content.sources;
			if (skipPrivateRepos) {
				contentSources = PlaybookLoaderUtils.removeProtectedSources(globalAntoraPlaybook.content.sources);
			}
			contentSources = this.modifyGlobalContentSources(contentSources);
		}
		return { contentSources };
	}

	modifyGlobalContentSources(sources) {
		sources = PlaybookLoaderUtils.replaceCurrentRepoWithHazelcastDocsUrl(sources);
		const currentRepoSource = PlaybookLoaderUtils.excludeBaseBranch(sources, this.currentRepoName, this.baseBranchName);
		PlaybookLoaderUtils.addCurrentBranchSource(currentRepoSource, sources);
		return sources;
	}
}

module.exports = { PlaybookLoader };
