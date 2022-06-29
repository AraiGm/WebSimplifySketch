function elt(name, attributes) {
	var node = document.createElement(name);
	if( attributes ) {
		for(var attr in attributes) {
			if(attributes.hasOwnProperty(attr)) {
				node.setAttribute(attr,attributes[attr]);
			}
		}
	}
	//渡される値のうち２以降は子要素として追加
	for(var i=2; i<arguments.length; i++) {
		var child = arguments[i];

		if( typeof child == "string" ) {
			child = document.createTextNode(child);
		}
		node.appendChild(child);
	}
	return node;
}