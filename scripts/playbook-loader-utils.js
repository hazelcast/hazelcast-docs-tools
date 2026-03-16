const YAML = require('yaml');
const fs = require('fs');
const {isMatch} = require('matcher');

class PlaybookLoaderUtils {
	static async fetchGlobalAntoraPlaybook() {
		const response = await fetch('https://api.github.com/repos/hazelcast/hazelcast-docs/contents/antora-playbook.yml');
		const playbook = await response.json();
		const globalAntoraPlaybookContent = Buffer.from(playbook.content, 'base64').toString('utf-8');
		return YAML.parse(globalAntoraPlaybookContent);
	}

	static async downloadGlobalRedirects(path = '_redirects') {
		const response = await fetch('https://api.github.com/repos/hazelcast/hazelcast-docs/contents/_redirects');
		const redirects = await response.json();
		const redirectsContent = Buffer.from(redirects.content, 'base64').toString('utf-8');
		fs.writeFileSync(
			path,
			redirectsContent,
			{ encoding: 'utf8' },
		);
	}

	static setLogLevel(logLevel) {
		if (logLevel !== 'debug') {
			global.console.debug = () => null;
		}
	}

	static async loadLocalAntoraData(path = './antora-playbook.yml') {
		const localAntoraPlaybookContent = fs.readFileSync(path, 'utf8');
		return YAML.parse(localAntoraPlaybookContent);
	}

	static removeProtectedSources(sources) {
		return sources.filter(source =>
			!(source.url === 'https://github.com/hazelcast/hazelcast-mono')
			&& !(source.url === 'https://github.com/hazelcast/management-center'));
	}

	static replaceCurrentRepoWithHazelcastDocsUrl(sources) {
		// in the global playbook it's declared with a dot `.`
		const hazelcastDocsSource = sources.find(source => source.url === '.');
		hazelcastDocsSource.url = 'https://github.com/hazelcast/hazelcast-docs';
		hazelcastDocsSource.branches = ['main'];
		return sources;
	}

	static writeGlobalAntoraPlaybookFile(playbook, path = './global-antora-playbook.yml') {
		const globalPlaybook = YAML.stringify(playbook);

		console.debug(globalPlaybook);

		fs.writeFileSync(
			path,
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
			ui: {
				...globalPlaybook.ui,
				...(localPlaybook.ui || {}),
				bundle: {
					...globalPlaybook.ui.bundle,
					...(localPlaybook.ui?.bundle || {}),
				}
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

	static addCurrentBranchSource(repoSource, sources) {
		const currentBranchSource = {
			url: '.',
			branches: 'HEAD',
		};

		if (repoSource.start_path) {
			currentBranchSource.start_path = repoSource.start_path.slice();
		}
		if (repoSource.start_paths) {
			currentBranchSource.start_paths = repoSource.start_paths.slice();
		}

		sources.unshift(currentBranchSource);
	}

	static excludeBaseBranch(sources, repoName, branchName) {
		// exclude current target branch from the global content list by adding the branch name with the "!" prefix
		const excludedBranch = `!${branchName}`;
		const matchedRepos = sources.filter(source => source.url.endsWith(repoName));
		if (matchedRepos.length === 0) {
			throw new Error(`There is no repository ${repoName} among the playbook sources!`);
		}

		const currentSource = PlaybookLoaderUtils.getCurrentSource(matchedRepos, branchName);
		if (Array.isArray(currentSource.branches)) {
			currentSource.branches.push(excludedBranch);
		} else {
			currentSource.branches = [currentSource.branches, excludedBranch];
		}

		return currentSource;
	}

	static rewriteCurrentVersionWithCiVersion() {
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
			PlaybookLoaderUtils.rewriteCurrentVersionWithCiVersion();
			currentSource = matchedRepos[0];
		}

		return currentSource;
	}
}

module.exports = { PlaybookLoaderUtils };
