const fs = require('fs');
const path = require('path');
const { parseArgs } = require('node:util');

const {
	values: argValues,
} = parseArgs({ options: {
		directory: {
			type: 'string',
			short: 'd',
			default: 'docs',
		},
		'log-failure-level': {
			type: 'string',
		},
	},
});

const ROOT_DIRECTORIES = argValues.directory.split(',');
const LOG_FAILURE_LEVEL = argValues['log-failure-level'];

class NavLinksCollector {
	static FILE_LINK_REGEXP = /xref:([\w,\s-]+:)?([.\w,\s-]+.adoc)/;
	static CHILD_NAV_REGEXP = /include::([\w,\s-]+):partial\$nav.adoc/;

	// @TODO: use hashmap or dictionary to optimize
	nav = [];
	rootDir = '';

	constructor(rootDir) {
		const rootNavUrl = path.join(rootDir, 'modules', 'ROOT', 'nav.adoc');
		this.rootDir = rootDir;
		this.nav = this.readNavFile(rootNavUrl, 'ROOT');
	}

	/**
	 *
	 * @param filename - name of the .adoc file
	 * @param urlModule - the part of the URL in the nav file before filename. It can be a module name or blank.
	 * 										if it's blank, it means that antora builder will look up the page in twp places:
	 * 										in "ROOT" or in the current module
	 * @param navModule - the directory name of the current nav.adoc file
	 * @returns {String[]} - Strings with page URLs
	 */
	buildFileUrl(filename, urlModule, navModule) {
		const result = [];
		if (urlModule) {
			result.push(path.join(this.rootDir, 'modules', urlModule, 'pages', filename));
		} else {
			// check if there is no urlModule, then it means, that the page can either be in "ROOT" or in the current module
			// that's why we are adding both possibilities to the list
			if (navModule !== 'ROOT') {
				result.push(path.join(this.rootDir, 'modules', 'ROOT', 'pages', filename));
			}
			result.push(path.join(this.rootDir, 'modules', navModule, 'pages', filename));
		}
		return result;
	}

	buildChildNavUrl(navModule) {
		// check if module is NULL, then use navModule instead
		return path.join(this.rootDir, 'modules', navModule, 'partials', 'nav.adoc');
	}

	readNavFile(url, navModule) {
		const nav = [];
		try {
			const lines = fs.readFileSync(url, 'utf-8').split('\n');

			for (const line of lines) {
				const match = line.match(NavLinksCollector.FILE_LINK_REGEXP);
				if (match) {
					const filename = match[2];
					// trim the ending ":"
					const fileModule = match[1]?.slice(0, -1);
					nav.push(...this.buildFileUrl(filename, fileModule, navModule));
				} else if (NavLinksCollector.CHILD_NAV_REGEXP.test(line)) {
					const match = line.match(NavLinksCollector.CHILD_NAV_REGEXP);
					const childNavModule = match[1];
					const childNav = this.readNavFile(this.buildChildNavUrl(childNavModule), childNavModule);
					nav.push(...childNav);
				}
			}

		} catch (err) {
			console.warn(`Could not read nav file in "${this.rootDir}"!`);
			if (LOG_FAILURE_LEVEL === 'error') {
				console.error(err);
			}
		}
		return nav;
	}

	iteratePageFiles() {
		const orphanPages = [];
		const rootModulesDir = path.join(this.rootDir, 'modules');
		fs.readdirSync(rootModulesDir).forEach((moduleDir) => {
			const moduleUrl = path.join(rootModulesDir, moduleDir);
			if (fs.statSync(moduleUrl).isDirectory()) {
				fs.readdirSync(path.join(moduleUrl, 'pages')).forEach((file) => {
					const fileUrl = path.join(moduleUrl, 'pages', file);
					if (!this.nav.includes(fileUrl)) {
						orphanPages.push(fileUrl);
					}
				});
			}
		});
		return orphanPages;
	}
}


function main() {
	ROOT_DIRECTORIES.forEach((rootDir) => {
		if (fs.existsSync(rootDir)) {
			// 1. Parse nav files and create a depth-first-traversal array of the page file links
			const linksCollector = new NavLinksCollector(rootDir);
			// 2. Iterate recursively over all {module}/pages and lookup it in the navigation tree
			const orphanPages = linksCollector.iteratePageFiles();

			if (orphanPages.length > 0) {
				console.error(`The following orphan pages were detected in "${rootDir}":`);
				console.error(orphanPages);
				process.exit(LOG_FAILURE_LEVEL === 'error' ? 1 : 0);
			}
		} else {
			console.warn(`There is no directory "${rootDir}" found!`);
		}
	})
	console.log('No orphan pages detected. YAY!');
}

main();
