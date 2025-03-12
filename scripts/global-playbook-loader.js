const YAML = require('yaml');
const { isMatch } = require('matcher');
const fs = require('fs');
const {parseArgs} = require('node:util');


class PlaybookLoader {
	static async fetchGlobalAntoraPlaybook() {
		const response = await fetch('https://api.github.com/repos/hazelcast/hazelcast-docs/contents/antora-playbook.yml');
		const playbook = await response.json();
		const globalAntoraPlaybookContent = Buffer.from(playbook.content, 'base64').toString('utf-8');
		return YAML.parse(globalAntoraPlaybookContent);
	}

	static async getGitData(argValues) {
		let currentRepoName = argValues.repo;
		let baseBranchName = argValues.branch;
		if (process.env.NETLIFY) {
			currentRepoName = process.env.REPOSITORY_URL?.replace('https://github.com/', '');
			baseBranchName = process.env.PULL_REQUEST ? await PlaybookLoader.getBranchNameFromPrId(currentRepoName) : process.env.BRANCH;
		}

		// check whether there are arguments after the filename
		if (!currentRepoName || !baseBranchName) {
			throw new Error('`repo` and `branch` must be specified!');
		}

		console.debug('Repository name: ', currentRepoName);
		console.debug('Base branch: ', baseBranchName);

		return { currentRepoName, baseBranchName };
	}

	static async loadLocalAntoraData() {
		const localAntoraPlaybookContent = fs.readFileSync('./antora-playbook.yml', 'utf8');
		return YAML.parse(localAntoraPlaybookContent);
	}

	static async getBranchNameFromPrId(repoName) {
		const prId = process.env.BRANCH?.replace('pull/', '').replace('/head', '');
		const response = await fetch(`https://api.github.com/repos/${repoName}/pulls/${prId}`);
		const prData = await response.json();
		return prData.base.ref;
	}

	static removeProtectedSources(sources) {
		return sources.filter(source =>
			!(source.url === 'https://github.com/hazelcast/hazelcast-mono')
			&& !(source.url === 'https://github.com/hazelcast/management-center'));
	}

	static addHazelcastDocsUrl(sources) {
		// in the global playbook it's declared with a dot `.`
		const hazelcastDocsSource = sources.find(source => source.url === '.');
		hazelcastDocsSource.url = 'https://github.com/hazelcast/hazelcast-docs';
		hazelcastDocsSource.branches = ['main'];
		return sources;
	}

	static rewriteCurrentVersion() {
		const antoraYmlPath = './docs/antora.yml';
		try {
			const antoraYml = YAML.parse(fs.readFileSync(antoraYmlPath, 'utf8'));
			const version = 'snapshot_ci';
			antoraYml.version = version;
			antoraYml.display_version = version;
			antoraYml.asciidoc.attributes['full-version'] = version;
			fs.writeFileSync(
				antoraYmlPath,
				YAML.stringify(antoraYml),
				{ encoding: 'utf8' },
			);
		} catch (err) {
			console.debug(err);
			console.warn('Could not rewrite version. There might be an error with version collision!');
		}
	}

	static excludeBaseBranch(sources, repoName, branchName) {
		// exclude current target branch from the global content list by adding the branch name with the "!" prefix
		const excludedBranch = `!${branchName}`;
		const matchedRepos = sources.filter(source => source.url.endsWith(repoName));
		if (matchedRepos.length === 0) {
			throw new Error(`There is no repository ${repoName} among the playbook sources!`);
		}

		const currentSource = PlaybookLoader.getCurrentSource(matchedRepos, branchName);
		if (Array.isArray(currentSource.branches)) {
			currentSource.branches.push(excludedBranch);
		} else {
			currentSource.branches = [currentSource.branches, excludedBranch];
		}

		return currentSource;
	}

	static getCurrentSource(matchedRepos, branchName) {
		let currentSource = matchedRepos.find(source => {
			if (Array.isArray(source.branches)) {
				return source.branches.find(branch => isMatch(branchName, branch));
			} else {
				return isMatch(branchName, source.branches);
			}
		});
		if (!currentSource) {
			console.debug(`No matching base branch found. Rewriting version to omit version collision!`);
			PlaybookLoader.rewriteCurrentVersion();
			currentSource = matchedRepos[0];
		}

		return currentSource;
	}

	static addCurrentBranch(repoSource, sources) {
		const currentBranchSource = {
			url: '.',
			branches: 'HEAD',
		};

		// 				- copy start_path(s) from the currentRepoSource
		if (repoSource.start_path) {
			currentBranchSource.start_path = repoSource.start_path.slice();
		}
		if (repoSource.start_paths) {
			currentBranchSource.start_paths = repoSource.start_paths.slice();
		}

		sources.unshift(currentBranchSource);
	}

	static writeGlobalAntoraPlaybookFile(playbook) {
		const globalPlaybook = YAML.stringify(playbook);

		console.debug(globalPlaybook);

		fs.writeFileSync(
			'./global-antora-playbook.yml',
			globalPlaybook,
			{ encoding: 'utf8' },
		);
	}

	static mergePlaybooks(globalPlaybook, localPlaybook, sources) {
		return {
			...globalPlaybook,
			site: {
				...globalPlaybook.site,
				...localPlaybook.site,
				keys: {
					...globalPlaybook.site.keys,
					...(localPlaybook.site?.keys || {}),
				}
			},
			content: {
				sources: sources,
			},
			antora: {
				extensions: localPlaybook.antora?.extensions || globalPlaybook.antora.extensions,
			},
			asciidoc: {
				attributes: {
					...globalPlaybook.asciidoc.attributes,
					...(localPlaybook.asciidoc?.attributes || {}),
				},
				extensions: localPlaybook.asciidoc?.extensions || globalPlaybook.asciidoc.extensions,
			},
		};
	}

	constructor() {}

	async loadPlaybook() {
		const { skipPrivateRepos } = await this.parseInputArgs();
		const localAntoraPlaybook = await PlaybookLoader.loadLocalAntoraData();
		const globalAntoraPlaybook = await PlaybookLoader.fetchGlobalAntoraPlaybook();
		let { contentSources } = this.loadContentSources(globalAntoraPlaybook, localAntoraPlaybook, skipPrivateRepos);
		const playbook = PlaybookLoader.mergePlaybooks(globalAntoraPlaybook, localAntoraPlaybook, contentSources);
		// 4. Replace local content.sources with the modified content.sources
		PlaybookLoader.writeGlobalAntoraPlaybookFile(playbook);
	}

	async parseInputArgs() {
		const {
			values: argValues,
		} = parseArgs({ options: {
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
				// use only global content sources even if local content sources are present
				// e.g. for links-checker we should always check in the context of global sources
				'enforce-global-sources': {
					type: 'boolean',
					default: false
				},
			},
		});

		const { currentRepoName, baseBranchName } = PlaybookLoader.getGitData(argValues);
		const logLevel = argValues['log-level'];
		const skipPrivateRepos = argValues['skip-private-repos'];
		const enforceGlobalSources = argValues['enforce-global-sources'];

		if (logLevel !== 'debug') {
			global.console.debug = () => null;
		}

		this.currentRepoName = currentRepoName;
		this.baseBranchName = baseBranchName;
		this.logLevel = logLevel;
		this.skipPrivateRepos = skipPrivateRepos;
		this.enforceGlobalSources = enforceGlobalSources;
		return { currentRepoName, baseBranchName, logLevel, skipPrivateRepos, enforceGlobalSources };
	}

	loadContentSources(globalAntoraPlaybook, localAntoraPlaybook, skipPrivateRepos) {
		let contentSources = localAntoraPlaybook.content?.sources;
		if (this.enforceGlobalSources || !contentSources) {
			contentSources = globalAntoraPlaybook.content.sources;
			if (skipPrivateRepos) {
				contentSources = PlaybookLoader.removeProtectedSources(globalAntoraPlaybook.content.sources);
			}
			contentSources = this.modifyGlobalContentSources(contentSources);
		}
		return { contentSources };
	}

	modifyGlobalContentSources(sources) {
		sources = PlaybookLoader.addHazelcastDocsUrl(sources);
		const currentRepoSource = PlaybookLoader.excludeBaseBranch(sources, this.currentRepoName, this.baseBranchName);
		PlaybookLoader.addCurrentBranch(currentRepoSource, sources);
		return sources;
	}
}

module.exports = { PlaybookLoader };
