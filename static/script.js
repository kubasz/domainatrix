var RemoteProperty = function (initValue, checker, parser, change, limit, startCallback, getRemote, initCallback) {
	this.checker = checker ? checker : ()=>{};
	this.parser = parser ? parser : function () {return arguments};
	this.change = change ? change : ()=>{};
	this.initCallback = initCallback ? initCallback : ()=>{};
	this.gettingRemote = false;
	this.value = initValue;
	this.callbacks = [];
	this.startCallback = startCallback ? startCallback : ()=>{};
	this.lastCall = 0;
	this.limit = limit ? limit : 0;
	initCallback = initCallback ? initCallback : ()=>{};
	if (getRemote === true) this.getRemote(initCallback);
	else initCallback(this.value);
}
RemoteProperty.prototype.getRemote = function (callback) {
	for (var ii = 0; ii < arguments.length; ii++) {
		if (typeof arguments[ii] === "function") this.callbacks.push(arguments[ii]);
	}
	if (this.gettingRemote === false) {
		if (this.lastCall + this.limit > Date.now()) this.runCallbacks();
		else {
			this.lastCall = Date.now();
			this.gettingRemote = true;
			this.startCallback(this.value);
			this.checker(this.setValue.bind(this));
		}
	}
}
RemoteProperty.prototype.setValue = function () {
	var oldVar = this.value;
	this.value = this.parser.apply(this, arguments);
	if (this.value !== oldVar) this.change(this.value);
	this.runCallbacks();
}
RemoteProperty.prototype.runCallbacks = function () {
	while (this.callbacks.length > 0) {
		(this.callbacks.pop())(this.value);
	}
}

var MoreInfo = function (infoNode, buttonNode, showing, showingText, hiddenText) {
	this.info = infoNode;
	this.button = buttonNode;
	if (showingText === undefined && hiddenText === undefined) this.useText = false;
	else this.useText = true;
	this.hiddenText = hiddenText ? hiddenText : this.button.innerHTML;
	this.showingText = showingText ? showingText : this.button.innerHTML;
	this.showing = showing ? showing : false;
	this.showing = !this.showing;
	this.toggle();
	this.button.addEventListener("click", this.toggle.bind(this));
}
MoreInfo.prototype.toggle = function () {
	if (this.showing) this.hide();
	else this.show();
	this.showing = !this.showing;
}
MoreInfo.prototype.hide = function () {
	this.info.style.display = "none";
	if (this.useText === true) this.button.innerHTML = this.hiddenText;
}
MoreInfo.prototype.show = function () {
	this.info.style.display = "initial";
	if (this.useText === true) this.button.innerHTML = this.showingText;
}
var blurb = new MoreInfo(document.getElementById("guide"), document.getElementById("toggleGuide"), false, "What is this? / More Info -", "What is this? / More Info +");

var DomainListItem = function (domainJson) {
	this.domain = domainJson.domainName;
	this.dns = new RemoteProperty({state: domainJson.dns.state, lastCheck: domainJson.dns.lastCheck}, this.getX.bind(this, "/dns"), JSON.parse.bind(JSON), this.update.bind(this), 30*60*1000, this.setDns.bind(this, {state: -1}), false);
	this.ping = new RemoteProperty({state: domainJson.ping.state, lastCheck: domainJson.ping.lastCheck}, this.getX.bind(this, "/ping"), JSON.parse.bind(JSON), this.update.bind(this), 30*60*1000, this.setPing.bind(this, {state: -1}), false);
	this.http = new RemoteProperty({state: domainJson.http.state, lastCheck: domainJson.http.lastCheck}, this.getX.bind(this, "/http"), JSON.parse.bind(JSON), this.update.bind(this), 30*60*1000, this.setHttp.bind(this, {state: -1}), false);
	var match = this.domain.match(/(([^\s]+)\.|)ed\.ac\.uk$/);
	this.hidden = false;
	if (match === null) {
		this.hide();
		this.show = this.hide;
	} else {
		this.subdomain = match[2];
		this.nodes = {};
		this.nodes.root = document.createElement("div");
		this.nodes.root.className = "domainListItem";

		this.nodes.title = document.createElement("a");
		this.nodes.title.className = "domainTitle";
		this.nodes.root.appendChild(this.nodes.title);

		this.nodes.dns = document.createElement("div");
		this.nodes.dns.className = "domainDns";
		this.nodes.ping = document.createElement("div");
		this.nodes.ping.className = "domainPing";
		this.nodes.http = document.createElement("div");
		this.nodes.http.className = "domainHttp";
		this.nodes.tableSpacer = document.createElement("div");
		this.nodes.tableSpacer.className = "domainTableSpacer";
		this.nodes.domainName = document.createElement("div");
		this.nodes.domainName.className = "domainName";

		this.nodes.prefix = document.createElement("span");
		this.nodes.prefix.className = "domainPrefix";
		//this.nodes.prefix.href = "http://" + this.domain;
		if (this.subdomain === undefined) {
			this.nodes.prefix.appendChild(document.createTextNode("(ed.ac.uk)"));
			this.nodes.prefix.style.color = "#999999";
		} else this.nodes.prefix.appendChild(document.createTextNode(this.subdomain));
		this.nodes.domainName.appendChild(this.nodes.prefix);

		this.nodes.title.appendChild(this.nodes.dns);
		this.nodes.title.appendChild(this.nodes.ping);
		this.nodes.title.appendChild(this.nodes.http);
		this.nodes.title.appendChild(this.nodes.tableSpacer);
		this.nodes.title.appendChild(this.nodes.domainName);

		this.nodes.info = document.createElement("div");
		this.nodes.info.className = "domainInfo moreInfo";
		this.moreInfo = new MoreInfo(this.nodes.info, this.nodes.title, false);
		this.nodes.root.appendChild(this.nodes.info);

		this.nodes.dnsRow = document.createElement("div");
		this.nodes.dnsRow.className = "domainInfoRow";
		this.nodes.updateDns = document.createElement("div");
		this.nodes.updateDns.className = "button domainInfoGet";
		this.nodes.updateDns.appendChild(document.createTextNode("Recheck"));
		this.nodes.updateDns.addEventListener("click", this.dns.getRemote.bind(this.dns, ()=>{}));
		this.nodes.dnsLastCheck = document.createElement("div");
		this.nodes.dnsLastCheck.className = "lastCheck";
		this.nodes.dnsLastCheck.appendChild(document.createTextNode("DNS Last Checked: " + this.formatDate(this.dns.value.lastCheck)));
		this.nodes.dnsRow.appendChild(this.nodes.updateDns);
		this.nodes.dnsRow.appendChild(this.nodes.dnsLastCheck);
		
		this.nodes.pingRow = document.createElement("div");
		this.nodes.pingRow.className = "domainInfoRow";
		this.nodes.updatePing = document.createElement("div");
		this.nodes.updatePing.className = "button domainInfoGet";
		this.nodes.updatePing.appendChild(document.createTextNode("Recheck"));
		this.nodes.updatePing.addEventListener("click", this.ping.getRemote.bind(this.ping, ()=>{}));
		this.nodes.pingLastCheck = document.createElement("div");
		this.nodes.pingLastCheck.className = "lastCheck";
		this.nodes.pingLastCheck.appendChild(document.createTextNode("Ping Last Checked: " + this.formatDate(this.ping.value.lastCheck)));
		this.nodes.pingRow.appendChild(this.nodes.updatePing);
		this.nodes.pingRow.appendChild(this.nodes.pingLastCheck);

		this.nodes.httpRow = document.createElement("div");
		this.nodes.httpRow.className = "domainInfoRow";
		this.nodes.updateHttp = document.createElement("div");
		this.nodes.updateHttp.className = "button domainInfoGet";
		this.nodes.updateHttp.appendChild(document.createTextNode("Recheck"));
		this.nodes.updateHttp.addEventListener("click", this.http.getRemote.bind(this.http, ()=>{}));
		this.nodes.httpLastCheck = document.createElement("div");
		this.nodes.httpLastCheck.className = "lastCheck";
		this.nodes.httpLastCheck.appendChild(document.createTextNode("HTTP Last Checked: " + this.formatDate(this.http.value.lastCheck)));
		this.nodes.httpRow.appendChild(this.nodes.updateHttp);
		this.nodes.httpRow.appendChild(this.nodes.httpLastCheck);

		this.nodes.goToDomainRow = document.createElement("div");
		this.nodes.goToDomainRow.className = "domainInfoRow";
		this.nodes.goToDomain = document.createElement("a");
		this.nodes.goToDomain.className = "button domainInfoGet goToDomain";
		this.nodes.goToDomain.href = "http://" + this.domain;
		this.nodes.goToDomain.appendChild(document.createTextNode("Go To This Domain"));
		this.nodes.goToDomainRow.appendChild(this.nodes.goToDomain);

		this.nodes.info.appendChild(this.nodes.dnsRow);
		this.nodes.info.appendChild(this.nodes.pingRow);
		this.nodes.info.appendChild(this.nodes.httpRow);
		this.nodes.info.appendChild(this.nodes.goToDomainRow);
	}
	this.updateKey = {
		"domainName": ()=>{},
		"dns": this.setDns.bind(this),
		"ping": this.setPing.bind(this),
		"http": this.setHttp.bind(this),
		"dnsLastCheck": ()=>{},
		"pingLastCheck": ()=>{},
		"httpLastCheck": ()=>{}
	}
	this.update(domainJson);
	if (this.ping.value.lastCheck === 0 || this.ping.value.state === -1 || this.ping.value.state === -2) {
		this.ping.getRemote(console.log.bind(this, "ping update ran due to 0 lastCheck"));
	}
	if (this.http.value.lastCheck === 0 || this.http.value.state === -1 || this.http.value.state === -2) {
		this.http.getRemote(console.log.bind(this, "http update ran due to 0 lastCheck"));
	}
}
DomainListItem.prototype.formatDate = function (timestamp) {
	if (timestamp === 0) return "Still Checking"
	var date = new Date(timestamp);
	return (date.getUTCFullYear()-2000).toString().padStart(2, "0") + "/" + date.getUTCMonth().toString().padStart(2, "0") + "/" + date.getUTCDate().toString().padStart(2, "0") + " " + date.getUTCHours().toString().padStart(2, "0") + ":" + date.getUTCMinutes().toString().padStart(2, "0");
}
DomainListItem.prototype.getX = function (endpoint, callback) { 
	var req = new XMLHttpRequest();
	req.open("GET", endpoint + "?domain=" + this.domain);
	req.onreadystatechange = (function (callback) {
		if (this.readyState === 4) {
			callback(req.response);
		}
	}).bind(req, callback);
	req.send();
}
DomainListItem.prototype.update = function (newJson) {
	for (var index in newJson) {
		if (newJson[index] !== this[index]) {
			this.updateKey[index](newJson[index]);
		}
	}
}
DomainListItem.prototype.colorCode = {
	"-1": "#CDDC39",
	"0": "#4CAF50",
	"1": "#FF5722",
}
DomainListItem.prototype.setDns = function (newDns) {
	if (newDns !== undefined) {
		this.dns.value.state = newDns.state !== undefined ? newDns.state : this.dns.value.state;
		this.dns.value.lastCheck = newDns.lastCheck !== undefined ? newDns.lastCheck : this.dns.value.lastCheck;
	}
	this.nodes.dns.style.backgroundColor = this.colorCode[this.dns.value.state];
	this.nodes.dnsLastCheck.innerHTML = "DNS Last Checked: " + this.formatDate(this.dns.value.lastCheck);
}
DomainListItem.prototype.setPing = function (newPing) {
	if (newPing !== undefined) {
		this.ping.value.state = newPing.state !== undefined ? newPing.state : this.ping.value.state;
		this.ping.value.lastCheck = newPing.lastCheck !== undefined ? newPing.lastCheck : this.ping.value.lastCheck;
	}
	this.nodes.ping.style.backgroundColor = this.colorCode[this.ping.value.state];
	this.nodes.pingLastCheck.innerHTML = "Ping Last Checked: " + this.formatDate(this.ping.value.lastCheck);
}
DomainListItem.prototype.setHttp = function (newHttp) {
	if (newHttp !== undefined) {
		this.http.value.state = newHttp.state !== undefined ? newHttp.state : this.http.value.state;
		this.http.value.lastCheck = newHttp.lastCheck !== undefined ? newHttp.lastCheck : this.http.value.lastCheck;
	}
	this.nodes.http.style.backgroundColor = this.colorCode[this.http.value.state];
	this.nodes.httpLastCheck.innerHTML = "HTTP Last Checked: " + this.formatDate(this.http.value.lastCheck);
}
DomainListItem.prototype.hide = function () {
	this.nodes.root.style.display = "none";
	this.hidden = true;
}
DomainListItem.prototype.show = function () {
	this.nodes.root.style.display = "";
	this.hidden = false;
}
DomainListItem.prototype.toggle = function () {
	if (this.hidden) this.show();
	else this.hide();
}
var DomainList = function (id, searchId, submitId, feedbackId, updateId, domainCountId) {
	/*
	state -2: Getting server domain list.
	state -1: Querying about one domain.
	state 0: The domain is legitimate.
	state 1: The domain is already in the remote list.
	state 2: The domain has no dns lookup.
	state 3: The domain does not meet the regular expression standard.
	state 4: The server returned its domain list.
	state 5: The server did not return a domain list.
	*/
	this.node = document.getElementById(id);
	this.searchNode = document.getElementById(searchId); 
	this.searchNode.addEventListener("input", this.searchDomainItems.bind(this));
	this.entries = {};
	this.orderedDomains = [];
	this.inputNode = document.getElementById(submitId);
	this.inputNode.addEventListener("keydown", this.handleInputKeys.bind(this));
	this.domainCount = document.getElementById(domainCountId);
	this.state = 0;
	this.feedback = {
		node: document.getElementById(feedbackId),
		stateTexts: {
			"-2": "Querying server for existing domains...",
			"-1": "Querying server about submitted domain...",
			"0":  "Domain legitimate. Added.",
			"1":  "Domain is already in the list.",
			"2":  "Domain has no DNS entry.",
			"3":  "Domain is not a subdomain of ed.ac.uk.",
			"4":  "Got the domain list from server.",
			"5":  "Could not get the domain list from server."
		},
		stateColours: {
			"-2": "#CDDC39",
			"-1": "#CDDC39",
			"0":  "#4CAf50",
			"1":  "#03A9F4",
			"2":  "#FF5722",
			"3":  "#FF5722",
			"4":  "#4CAf50",
			"5":  "#CDDC39"
		},
		setState: function (state) {
			this.node.innerHTML = this.stateTexts[state];
			this.node.style.backgroundColor = this.stateColours[state];
		}
	}
	this.updateNode = document.getElementById(updateId);
	this.updateNode.addEventListener("click", this.getRemoteDomains.bind(this));
	this.getRemoteDomains();
}
Object.defineProperty(DomainList.prototype, "search", {
	"get": function () {
		return this.searchNode.value;
	},
	"set": function (newSearch) {
		this.searchNode.value = newSearch;
	}
});
DomainList.prototype.setState = function (state) {
	this.state = state;
	this.feedback.setState(state);
}
DomainList.prototype.handleInputKeys = function (e) {
	if (e.keyCode === 13) {
		e.preventDefault();
		this.askDomain(this.inputNode.value);
	}
}
DomainList.prototype.findOrderedIndex = function (domain, subsetLeft, subsetRight) {
	subsetLeft = subsetLeft !== undefined ? subsetLeft : 0;
	subsetRight = subsetRight !== undefined ? subsetRight : this.orderedDomains.length;
	while (subsetLeft !== subsetRight) {
		var checkDomain = this.orderedDomains[subsetLeft + Math.floor((subsetRight - subsetLeft) / 2)];
		if (checkDomain > domain) subsetRight = subsetLeft + Math.floor((subsetRight - subsetLeft) / 2);
		else subsetLeft = subsetRight - Math.floor((subsetRight - subsetLeft) / 2);
	}
	return subsetLeft;
}
DomainList.prototype.addDomainItem = function (resJson) {
	if (this.entries[resJson.domainName] === undefined) {
		var orderedIndex = this.findOrderedIndex(resJson.domainName);
		this.orderedDomains.splice(orderedIndex, 0, resJson.domainName);
		this.entries[resJson.domainName] = new DomainListItem(resJson);
		if (this.node.children.length === 0) {
			this.node.appendChild(this.entries[resJson.domainName].nodes.root);
		} else if (orderedIndex === this.node.children.length) {
			this.node.appendChild(this.entries[resJson.domainName].nodes.root);
		} else {
			this.node.insertBefore(this.entries[resJson.domainName].nodes.root, this.node.children[orderedIndex]);
		}
		this.searchDomainItems();
	} else {
		this.entries[resJson.domainName].update(resJson);
	}
}
DomainList.prototype.askDomain = function (domain) {
	if (this.state >= 0) {
		this.feedback.setState(-1);
		var req = new XMLHttpRequest();
		req.open("GET", "/add?domain="+domain);
		req.onreadystatechange = (function (req) {
			if (req.readyState === 4) {
				this.serverResponseControl(req.response);
			}
		}).bind(this, req);
		req.send();
	} else {
		console.log("State already running, wait until later.");
	}
}
DomainList.prototype.getRemoteDomains = function () {
	if (this.state >= 0) {
		this.setState(-2);
		var req = new XMLHttpRequest();
		req.open("GET", "/data?t=" + Date.now().toString(36));
		req.onreadystatechange = (function (req) {
			if (req.readyState === 4) {
				this.setRemoteDomains(req.response);
			}
		}).bind(this, req);
		req.send();
	} else {
		console.log("State already running, wait until later.");
	}

}
DomainList.prototype.setRemoteDomains = function (res) {
	try {
		var resJson = JSON.parse(res);
		for (var ii = 0; ii < resJson.length; ii++) {
			this.addDomainItem(resJson[ii]);
		}
		this.setState(4);
		this.searchDomainItems();
	} catch (e) {
		this.setState(5);
		console.log(e, "Illegitimate output from server on /data endpoint.");
	}
}
DomainList.prototype.serverResponseControl = function (res) {
	try {
		var resJson = JSON.parse(res);
		this.setState(resJson.state);
		if (resJson.state === 0) {
			this.addDomainItem(resJson.data);
		} else {
		}
	} catch (e) {
		console.log(e, "Illegitimate output from server on /add endpoint.");
	}
}
DomainList.prototype.searchDomainItems = function (e) {
	if (this.search === "") {
		var entriesExist = 0;
		var entriesShown = 0;
		for (var domain in this.entries) {
			this.entries[domain].show();
			entriesExist++;
			entriesShown++;
		}
		this.domainCount.innerHTML = entriesShown.toString() + "/" + entriesExist.toString();
	} else {
		try {
			var regex = new RegExp(this.search);
		} catch (e) {
			return;
		}
		var entriesExist = 0;
		var entriesShown = 0;
		for (var domain in this.entries) {
			var subdomain = this.entries[domain].domain === "ed.ac.uk" ? "ed.ac.uk" : this.entries[domain].subdomain;
			if (subdomain === undefined) continue;
			if (subdomain.match(regex) !== null) {
				this.entries[domain].show();
				entriesShown++;
			} else this.entries[domain].hide();
			entriesExist++;
		}
		this.domainCount.innerHTML = entriesShown.toString() + "/" + entriesExist.toString();
	}
}
console.log("Script loaded.");
var list = new DomainList("domainList", "searchDomainInput", "addDomainInput", "serverFeedback", "updateDomainList", "domainCount");

