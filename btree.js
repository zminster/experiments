const MAX_DEGREE = 3;

// root node structure
function node_factory() {
	return {
		keys: [],
		children: []
	}
}

function insert(node, key) {
	// recursively find the spot for this key and put it there
	// call splitChild on it as you come back up.
	// find the child node where this key would slot

	// base case
	if (!node.children.length) {
		node = spliceElement(node, key);
		return splitChild(node);
	}

	for (let i = 0; i <= node.keys.length; i++) {
		if ((i < node.keys.length && key < node.keys[i]) || i == node.keys.length) {
			let split = insert(node.children[i], key);
			// if the insertion at this level required splitting, we need to merge this "subtree" with this node
			if (split)
				merge(node, i);
			if(splitChild(node))
				return node;
			else
				return null;
		}
	}
}

function merge(node, split_posn) {
	let split_node = node.children[split_posn];
	node.keys[split_posn] = split_node.keys[0];
	node.children[split_posn] = split_node.children[0];
	node.children[split_posn+1] = split_node.children[1];
}

function spliceElement(node, key) {
	// find correct location for key in this node
	// invariant: we always assume there's space for this key in the node
	// if there isn't, splitChild will clean up after us.
	if (!node.keys) {
		node.keys[0] = key;
		return node;
	}
	for (let i = 0; i < node.keys.length; i++) {
		if (key < node.keys[i]) {
			node.keys.splice(i, 0, key);
			return node;
		}
	}
	node.keys.push(key);
	return node;
}

function splitChild(node) {
	// in general, the btree grows UPWARD after hitting base case
	// this helper function will:
	// split a full node (leaf or otherwise) into a node with a single key and two children
	// return the node with the single key and two children
	// the overall traversal algo will then use this at each level to "correct"
	// as the recursion comes back up the stack

	// fullness check -- no split needed
	if (node.children.length <= MAX_DEGREE && node.keys.length <= MAX_DEGREE - 1) return null;

	// split if needed
	let midpt = Math.floor(MAX_DEGREE/2);
	let left = node_factory();
	let right = node_factory();

	// construct left and right children properly with splice
	left.children = node.children.splice(0, midpt+1);
	right.children = node.children.splice(0);
	left.keys = node.keys.splice(0, midpt);
	right.keys = node.keys.splice(1);

	// construct new parent node and pass it back
	node.children = [left, right];
	return node;
}

function del(node, key) {
	// (base) case: key not found
	// TODO: search for and return
	// (could probably handle this as we drop down if we are clever)

	// case: root node contains key
	// TODO: ??

	// else: call helper in appropriate child
	for (let i = 0; i <= node.keys.length; i++) {
		if ((i < node.keys.length && key < node.keys[i]) || i == node.keys.length) {
			del_helper(node.children[i], key, node, i);
			break;
		}
	}
}

function find_largest_and_remove(node, parent) {
	if (!node.children.length) {	// leaf node
		// find largest
		return del_helper(node, node.keys[node.keys.length-1], parent, node.keys.length);
	} else {
		return find_largest_and_remove(node.children[node.children.length-1], node);
	}
}

function find_smallest_and_remove(node, parent) {
	if (!node.children.length) {
		return del_helper(node, node.keys[0], parent, 0);
	} else {
		return find_smallest_and_remove(node.children[0], node);
	}
}

function del_helper(node, key, parent, keyPos) {
	console.log("DEL HELPER DELETING", key, "in", JSON.stringify(node));
	// Internal Node Cases
	if (node.children.length) {
		console.log("INTERNAL NODE");
		// (carry forward) case: check for key at this level -- if not found, recur
		let keyPos;
		for (let i = 0; i < node.keys.length; i++) {
			if (key == node.keys[i]) {
				keyPos = i;
				break;
			} else if (i + 1 < node.keys.length && key < node.keys[i] && key > node.keys[i + 1]) {
				del_helper(node.children[i], key, node, i);
				return key;
			} else if (i == node.keys.length-1 && key > node.keys[i]) {
				del_helper(node.children[i+1], key, node, i+1);
				return key;
			}
		}

		console.log("INTERNAL KEY FOUND", keyPos);

		// (key found) case: find (remove) new value and bring up
		let removed = find_smallest_and_remove(node.children[keyPos+1], node);
		console.log("POST REMOVE NODE", JSON.stringify(node));
		node.keys[keyPos] = removed;
	}

	// Leaf Node Cases
	if (!node.children.length) {
		let thresh = Math.floor(MAX_DEGREE / 2);
		
		// no matter what: remove the key
		let removed, removedPos;
		for (let i = 0; i < node.keys.length; i++) {
			if (key == node.keys[i]) {
				removed = node.keys.splice(i, 1);
				removedPos = i;
				break;
			}
		}
		if (!removed) {	// (base case of nonexistent delete key)
			return null;
		}

		// case: no underflow
		if (node.keys.length >= thresh) {
			return key;
		}

		// case: underflow, left sibling exists and borrowable
		if (keyPos-1 >= 0 && parent.children[keyPos-1].keys.length > thresh) {
			// borrow from left sibling
			let sibling = parent.children[keyPos-1];
			let borrowKey = sibling.keys.splice(sibling.keys.length-1, 1);
			// splay up borrowed key to parent
			borrowKey = parent.keys.splice(keyPos-1, 1, ...borrowKey);
			// insert into this node
			node.keys.splice(0, 0, ...borrowKey);
			// done
			return key;
		}

		// case: underflow, right sibling exists and borrowable
		if (keyPos+1 < parent.keys.length && parent.children[keyPos+1].keys.length > thresh) {
			let sibling = parent.children[keyPos+1];
			let borrowKey = sibling.keys.splice(0, 1);
			// splay up borrowed key to parent
			borrowKey = parent.keys.splice(keyPos, 1, ...borrowKey);
			// insert into this node
			node.keys.push(...borrowKey);
			// done
			return key;
		}

		// case: underflow, nonexistent / nonborrowable siblings
		// we need to merge THIS node into sibling, shifting down a key from the parent node and removing child
		let siblingPos;
		siblingPos = keyPos - 1 >= 0 ? keyPos-1 : keyPos+1;
		let sibling = parent.children[siblingPos];

		// merge
		sibling.keys.splice(siblingPos < keyPos ? node.keys.length-1: 0, node.keys.length, ...node.keys);

		// sibling.children.splice(siblingPos < keyPos ? node.children.length-1 : 0, node.children.length, node.children); FUTURE MIDDLE CASE
		node.keys = [];
		node.children = [];

		// correct parent node
		sibling.keys.splice(siblingPos < keyPos ? sibling.keys.length : 0, 0, ...parent.keys.splice(siblingPos < keyPos ? siblingPos : keyPos, 1));
		parent.children.splice(keyPos, 1);

		return key;
	}
}

/*let fake_test_node = node_factory();

fake_test_node.keys = [3,5,8];
fake_test_node.children = [node_factory(), node_factory(), node_factory(), node_factory()];
fake_test_node = splitChild(fake_test_node);

console.log(JSON.stringify(fake_test_node));*/
let root = node_factory();
// insert(root, 1);
// insert(root, 2);
// insert(root, 7);
// insert(root, 8);
// insert(root, 9);
// insert(root, 6);	// test middle cases

insert(root, 1);
insert(root, 2);
insert(root, 3);
insert(root, 4);
insert(root, 5);
insert(root, 6);
insert(root, 7);
insert(root, 8);
insert(root, 9);
insert(root, 10);
// del(root, 9);
// del(root, 10);
del(root, 8);
console.log("FRESH", JSON.stringify(root));
del(root, 9);
console.log(JSON.stringify(root));
