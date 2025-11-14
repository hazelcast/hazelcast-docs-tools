function homeCard ({ icon, link, title }) {
	return `
		<div class="card">
			<div class="card-header">
				<!-- <img class="card-img" src="{{{uiRootPath}}}/img/team.svg" alt="team" /> -->
				<i data-feather="server" class="card-img"></i>
				<h4 class="card-title">${title}</h4>
			</div>
			<ul class="card-list">
				<li class="card-list-item">
            <a href="{{{siteRootPath}}}/hazelcast/5.6/whats-new">What’s new in 5.6</a>
          </li>
          <li class="card-list-item">
            <a href="{{{siteRootPath}}}/hazelcast/latest/deploy/choosing-a-deployment-option">Available topologies</a>
          </li>
          <li class="card-list-item">
            <a href="{{{siteRootPath}}}/hazelcast/latest/getting-started/editions">Community vs. Enterprise</a>
          </li>
          <li class="card-list-item">
            <a href="{{{siteRootPath}}}/hazelcast/latest/deploy/deploying-in-cloud">Cloud deployment</a>
          </li>
			</ul>
		</div>
	`
}

function tabsBlock () {
	this.onContext('example');
	this.process(function (parent, reader, attrs) {
		console.log('attrs', attrs);
		const result = homeCard({ icon: 'icon', link: attrs.link, title: attrs.title });
		return this.createBlock(parent, 'pass', result);
	})
}

function register (registry) {
	registry.block('home_card', tabsBlock)
}

module.exports.register = register
