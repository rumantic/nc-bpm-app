
const modelRefIcon = require('./chevron.svg');
import { useService } from 'bpmn-js-properties-panel';


export default class ncPalette {
	public bpmnFactory;
	public create;
	public elementFactory;
	public translate;
	public palette;
	static $inject = ['bpmnFactory', 'create', 'elementFactory', 'palette', 'translate'];

	constructor(bpmnFactory, create, elementFactory, palette, translate) {
		this.bpmnFactory = bpmnFactory;
		this.create = create;
		this.elementFactory = elementFactory;
		this.translate = translate;
		this.palette = palette;
		palette.registerProvider(this);
	}

	getPaletteEntries(element) {
		const {
			bpmnFactory,
			create,
			elementFactory,
			translate
		} = this;

		async function createModelRef(event) {
			const bo = bpmnFactory.create('bpmn:CallActivity');
			bo.chevron = true;
			const shape = elementFactory.createShape({ type: 'bpmn:CallActivity', businessObject: bo });
			await create.start(event, shape);

			const chevronEvent = new CustomEvent('customElementAdded',{
				bubbles:true,
				cancelable: true,
				composed: true,
				detail: {elmt: bo}
			});

			let canvas = document.getElementsByClassName('bpmn-canvas')[0];
			if(canvas){
				canvas.dispatchEvent(chevronEvent);
			}
			
		}

		return {
			'create.model-ref': {
				group: 'activity',
				className: 'nc-bpmn-icon nc-icon-model-ref',
				imageUrl: modelRefIcon,
				title: translate('Create Model Reference'),
				action: {
					dragstart: createModelRef,
					click: createModelRef
				}
			},
		}
	}
}

ncPalette.$inject = [
	'bpmnFactory',
	'create',
	'elementFactory',
	'palette',
	'translate'
];