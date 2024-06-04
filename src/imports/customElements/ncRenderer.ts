import BaseRenderer from 'diagram-js/lib/draw/BaseRenderer';

import {
	append as svgAppend,
	attr as svgAttr,
	create as svgCreate,
	remove as svgRemove,
} from 'tiny-svg';

import {isAny, getBusinessObject } from 'bpmn-js/lib/util/ModelUtil'
const HIGH_PRIORITY = 1500, TASK_BORDER_RADIUS = 2;

export default class CustomRenderer extends BaseRenderer {

	private bpmnRenderer: BaseRenderer;
	static $inject = ['eventBus', 'bpmnRenderer'];
	
	constructor(eventBus, bpmnRenderer) {
		super(eventBus, HIGH_PRIORITY);
		this.bpmnRenderer = bpmnRenderer;
	}

	canRender(element) {
		// only render tasks and events (ignore labels)
		if(isAny(element, ['bpmn:CallActivity']) && !element.labelTarget){
			let bo = getBusinessObject(element);
			const {chevron } = bo;
			if(chevron){
				return true;
			}
		}
		return false;
	}

	drawShape(parentNode, element) {
		const bo = getBusinessObject(element);
		const shape = this.bpmnRenderer.drawShape(parentNode, element);
		const chevron = drawChevron(parentNode, '#ff3399');//100, 80, TASK_BORDER_RADIUS, '#52B415');

		prependTo(chevron, parentNode);

		svgRemove(shape);

		return shape;
	}

	getShapePath(shape) {
		return this.bpmnRenderer.getShapePath(shape);
	}
}

CustomRenderer.$inject = ['eventBus', 'bpmnRenderer'];

// helpers //////////

// copied from https://github.com/bpmn-io/bpmn-js/blob/master/lib/draw/BpmnRenderer.js
function drawRect(parentNode, width, height, borderRadius, strokeColor) {
	const rect = svgCreate('rect');

	svgAttr(rect, {
		width: width,
		height: height,
		rx: borderRadius,
		ry: borderRadius,
		stroke: strokeColor || '#000',
		strokeWidth: 2,
		fill: '#fff'
	});

	svgAppend(parentNode, rect);

	return rect;
}

// copied from https://github.com/bpmn-io/bpmn-js/blob/master/lib/draw/BpmnRenderer.js
function drawChevron(parentNode, strokeColor) {

	//const img = require('./chevron.svg');


	const chevron = svgCreate('path');
	//innerSVG(chevron, img);
	svgAttr(chevron, {
		style: "fill:none;stroke:#74e04a;stroke-width:2;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1",
		//d: "m 48.060251,24.740612 4.78183,11.24332 -4.78183,11.24333 22.68135,-0.0249 4.78183,-11.24333 -4.78183,-11.24334 z",
		d: 'm 52.705076,31.160044 18.217606,38.733191 -18.217606,38.733225 86.410414,-0.0857 18.2176,-38.733231 -18.2176,-38.733262 z',

		transform: "translate(-59,-30)"

		// stroke: strokeColor || '#000',
		// strokeWidth: 4,
		// fill: '#fff',
		// width: '29.094812mm',
		// height: '23.906267mm',	 
	});
	svgAppend(parentNode, chevron);

	return chevron;
}
// copied from https://github.com/bpmn-io/diagram-js/blob/master/lib/core/GraphicsFactory.js
function prependTo(newNode, parentNode) {
	parentNode.insertBefore(newNode, parentNode.firstChild);
}