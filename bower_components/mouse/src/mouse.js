(function (root, factory) {
	if (typeof define === 'function' && define.amd) {
		// AMD
		define(['on'], factory);
	}
	else if (typeof module === 'object' && module.exports) {
		// Node / CommonJS
		module.exports = factory(require('on'));
	}
	else {
		// Browser globals (root is window)
		root['mouse'] = factory(root.on);
	}
}(this, function (on) {
	'use strict';

	function mouse (parent, options) {
		options = options || {};
		var
			isConstrained = options.constrain || options.horizontal || options.vertical,
			constrain,
			upHandle,
			moveHandle,
			multiHandle,
			box,
			cBox,
			org,
			last,
			lastx,
			lasty,
			handles,
			downHandles = [],
			mouseTarget,
			realTarget,
			downNodes,
			isDown = false;

		if (options.downNodes) {
			downNodes = options.downNodes;
		} else {
			downNodes = [options.downNode || parent];
		}

		function findInList (target, targets) {
			var i, node;
			for (i = 0; i < targets.length; i++) {
				if (targets[i] === target) {
					return targets[i];
				}
			}
			return null;
		}

		function findTarget (child, targets) {
			var target;
			while (!target && child !== document.body) {
				target = findInList(child, targets);
				if (target) {
					return target;
				}
				child = child.parentNode;
			}
			return null;
		}

		function onMove (e) {
			e.preventDefault();
			var
				x = e.clientX - box.x,
				y = e.clientY - box.y;

			if (x > 0 && x < box.w) {
				last.x = x - lastx;
				lastx = x;
			}
			if (y > 0 && y < box.h) {
				last.y = y - lasty;
				lasty = y;
			}

			emit('move', x, y);
			return false;
		}

		function onDown (e) {
			isDown = true;
			box = getBox(parent);
			realTarget = e.target;
			mouseTarget = findTarget(e.target, downNodes);
			cBox = getBox(mouseTarget);

			var
				x = e.clientX - box.x,
				y = e.clientY - box.y;

			lastx = x;
			lasty = y;

			org = cBox;
			org.x -= box.x;
			org.y -= box.y;

			last = {
				x: 0,
				y: 0
			};
			multiHandle.resume();
			emit('down', x, y);
		}

		function onTrack (e) {
			if (isDown) {
				return;
			}
			box = getBox(parent);
			realTarget = e.target;
			mouseTarget = downNodes[0];
			cBox = getBox(mouseTarget);

			var
				x = e.clientX - box.x,
				y = e.clientY - box.y;

			lastx = x;
			lasty = y;

			org = cBox;
			org.x -= box.x;
			org.y -= box.y;

			last = {
				x: 0,
				y: 0
			};

			multiHandle.resume();
			emit('track', x, y);
		}

		function onUp (e) {
			isDown = false;
			multiHandle.pause();
		}

		moveHandle = on(window, 'mousemove', function (e) {
			onMove(e)
		});
		upHandle = on(window, 'mouseup', onUp);

		handles = [moveHandle, upHandle];

		if (options.track) {
			if (downNodes.length !== 1) { throw new Error('Only one downNode can be tracked'); }
			downHandles.push(on(parent, 'mousedown', onTrack));
		}

		downNodes.forEach(function (node) {
			downHandles.push(
				on(node, 'mousedown', onDown)
			);
		});

		if (isConstrained) {
			constrain = mouse.constrain(options);
			handles.push(
				on(parent, 'mouse', constrain)
			)
		}

		multiHandle = on.makeMultiHandle(handles);
		multiHandle.pause();
		return on.makeMultiHandle(downHandles);

		function emit (type, x, y) {
			on.emit(parent, 'mouse', {
				x: x,
				y: y,
				px: range(x / box.w, 0, 1),
				py: range(y / box.h, 0, 1),
				org: org,
				parent: box,
				last: last,
				dist: {
					x: x - org.x,
					y: y - org.y
				},
				up: type === 'up',
				down: type === 'down' || type === 'track',
				move: type === 'move',
				track: type === 'track',
				mouseType: type,
				mouseTarget: mouseTarget,
				realTarget: realTarget
			});
		}
	}

	mouse.constrain = function (options) {
		var dx, dy, dw, dh;
		return function (e) {
			if (e.down) {
				dx = e.org.x;
				dy = e.org.y;
				if (options.centerEdge) {
					dw = e.parent.w;
					dh = e.parent.h;
				} else {
					dw = e.parent.w - e.org.w;
					dh = e.parent.h - e.org.h;
				}
			}

			if (e.down && e.track) {
				dx = e.x - (options.centerEdge ? 0 : (e.org.w/2));
				dy = e.y - (options.centerEdge ? 0 : (e.org.h/2));
			} else {
				dx += e.last.x;
				dy += e.last.y;
			}

			dx = Math.max(0, Math.min(dx, dw));
			dy = Math.max(0, Math.min(dy, dh));
			pos(e.mouseTarget, dx, dy);
		}
	};

	return mouse;

}));

function range (value, min, max) {
	return Math.min(max, Math.max(min, value));
}

function pos (node, x, y) {
	node.style.left = x + 'px';
	node.style.top = y + 'px';
}

function getBox (node) {
	if (node === window) {
		node = document.documentElement;
	}

	var
		box = node.getBoundingClientRect();
	return {
		h: box.height,
		w: box.width,
		x: box.left,
		y: box.top
	};
}