const asciidoctor = require('asciidoctor')();

const registry = asciidoctor.Extensions.create();

require('../antora-macro/home-card').register(registry);

asciidoctor.convertFile('./demo/demo.adoc', {
	extension_registry: registry,
	to_dir: './build',
	mkdirs: true,
	standalone: false,
});
