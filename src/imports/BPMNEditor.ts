import Modeler from 'bpmn-js/lib/Modeler';
import Viewer from 'bpmn-js/lib/Viewer';
import {
	BpmnPropertiesPanelModule,
	BpmnPropertiesProviderModule,
} from 'bpmn-js-properties-panel';
import camundaModdleDescriptor from 'camunda-bpmn-moddle/resources/camunda.json';
import api from './api';
import Editor from './Editor';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js-properties-panel/dist/assets/properties-panel.css';
import 'bpmn-js-properties-panel/dist/assets/element-templates.css';

import '@fortawesome/fontawesome-free/js/all.js';
import '@fortawesome/fontawesome-free/js/solid.js';

import './Editor.scss';
import { jsPDF } from 'jspdf';
import { is, isAny, getBusinessObject } from 'bpmn-js/lib/util/ModelUtil';

import propertiesProvider from './provider';
import propDescriptor from './descriptors/ncModeler.json';

declare type Modeler = {
	destroy(): void,
	on(event: string, callback: (...any) => void): void
	importXML(xml: string): Promise<{ warnings: string[] }>
	saveXML(options?: { format?: boolean, preamble?: boolean }): Promise<{ xml: string }>
	saveSVG(): Promise<{ svg: string }>
	get(serviceName: string, strict?: boolean): any
}

const PLAIN_TEMPLATE = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn2:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xsi:schemaLocation="http://www.omg.org/spec/BPMN/20100524/MODEL BPMN20.xsd" id="sample-diagram" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn2:process id="Process_1" isExecutable="false">
    <bpmn2:startEvent id="StartEvent_1"/>
  </bpmn2:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds height="36.0" width="36.0" x="412.0" y="240.0"/>
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn2:definitions>`;

export default class BPMNEditor extends Editor {

	private modeler: Modeler;

	protected getContent(): Promise<string> {
		if (this.modeler) {
			console.log('***************************************************\nWe are loading a modeler');
			return this.modeler.saveXML().then(data => data.xml);
		}

		if (this.file.etag || OCA.Sharing?.PublicApp) {
			return api.getFileContent(this.file.path, this.file.name);
		}

		return Promise.resolve(PLAIN_TEMPLATE);
	}

	protected async getSVG(): Promise<string> {
		if (this.modeler) {
			return (await this.modeler.saveSVG()).svg;
		}

		throw new Error('Modeler not loaded');
	}

	protected async destroy(): Promise<void> {
		this.modeler && this.modeler.destroy();

		//this.removeResizeListener(this.onResize);
	}
	protected async pdfAdditions(pdf: jsPDF): Promise<void> {
		const title = 'BPMN Diagram';
		pdf.text(title, 10, 10);

		const canvas = this.modeler.get('canvas');
		const rootelem = canvas.getRootElement();

		if (rootelem.type == 'bpmn:SubProcess') {
			const mainProc = this.modeler.get('elementRegistry')
				.filter(el => isAny(el, ['bpmn:Process', 'bpmn:Collaboration']) && !is(el, 'bpmn:SubProcess'))[0];
			canvas.setRootElement(mainProc);
		}

		const subprocesses = this.modeler.get('elementRegistry').filter(el => el.type === 'bpmn:SubProcess' && el.hasOwnProperty('layer'));


		for (let i = 0; i < subprocesses.length; i++) {
			const svgContainer = $('<div>');
			svgContainer.css({
				position: 'fixed',
				bottom: '100%',
			});
			canvas.setRootElement(subprocesses[i]);
			svgContainer.append(await this.getSVG());
			svgContainer.appendTo(this.containerElement);

			const subsvg = svgContainer.find('svg').get(0);
			if (subsvg) {
				pdf.addPage('a4', 'landscape');
				await pdf.svg(subsvg, {
					x: 15,
					y: 15,
					width: 267,
					height: 180,
				});
			}
			svgContainer.remove();

		}
		canvas.setRootElement(rootelem);
	}

	//helper method for getting the extension element values?
	private extElemHelper = (xml) => {

		let extensionDict = new Map<string, Array<[string, string]>>();

		const parser = new DOMParser();
		const xmlData = parser.parseFromString(xml, 'text/xml');

		let elements = xmlData.getElementsByTagName('bpmn:extensionElements');

		for (let i = 0; i < elements.length; i++) {
			let parent = elements[i].parentElement?.id ?? 'na'; //na is a placeholder; this should not be a possible value
			let children = new Array<[string, string]>();
			let childArray = elements[i].getElementsByTagName('nc:property');
			for (let j = 0; j < childArray.length; j++) {
				children.push([childArray[j].getAttribute('name') ?? 'na', childArray[j].getAttribute('value') ?? 'na']);
			}
			extensionDict.set(parent, children);
		}
		return extensionDict;
	};
	protected async runEditor(): Promise<void> {
		const bpmnXML = await this.getContent();
		const modeler = this.getModeler();
		const moddle = this.modeler.get('moddle');
		try {
			await modeler.importXML(bpmnXML);

			//Hack to manually extract and set the extension elements
			let extensionElementsDict = this.extElemHelper(bpmnXML);
			let elements = modeler.get('elementRegistry');

			elements.forEach(function (element) {
				let bo = getBusinessObject(element);
				let extensionParent = bo.extensionElements || moddle.create('bpmn:ExtensionElements');
				if (!extensionParent.values) {
					extensionParent.values = [];
				}
				let extProperties = extensionElementsDict.get(element.id) || [];
				for (let i = 0; i < extProperties.length; i++) {
					const prop = extProperties[i];
					const property = moddle.create('nc:property', { name: prop[0], value: prop[1] });
					extensionParent.get('values').push(property);
				}
			});

			this.addOverlays();
			//this.addResizeListener(this.onResize);
		} catch (err) {
			console.log(err);
			this.showLoadingError(err.toString());
		}
	}

	private onResize = () => {
		this.modeler && this.modeler.get('canvas').resized();
	}

	private getModeler() {
		if (!this.modeler) {
			const containerElement = this.getAppContainerElement();
			const canvasElement = containerElement.find('.bpmn-canvas');
			const propertiesElement = containerElement.find('.bpmn-properties');
			this.modeler = this.isFileUpdatable() ? new Modeler({
				container: canvasElement,
				additionalModules: [
					BpmnPropertiesPanelModule,
					BpmnPropertiesProviderModule,
					propertiesProvider,
				],
				propertiesPanel: {
					parent: propertiesElement,
					layout: {
						open: true,
						groups: {
							general: { open: true },
							documentation: { open: true },
							nc: { open: true },
						},
					},
				},
				moddleExtensions: {
					camunda: camundaModdleDescriptor,
					nc: propDescriptor,
				},
				keyboard: { bindTo: window },
			}) : new Viewer({
				container: canvasElement,
			});
			this.modeler.on('element.changed', () => {
				if (!this.hasUnsavedChanges) {
					this.hasUnsavedChanges = true;

					containerElement.attr('data-state', 'unsaved');
				}
			});

		}

		return this.modeler;
	}


	private addOverlays() {
		const elements = this.modeler.get('elementRegistry');
		const overlays = this.modeler.get('overlays');

		elements.forEach(function (element) {
			if (is(element, 'bpmn:CallActivity')) {
				try {
					const extValues = element.businessObject.extensionElements?.values;
					const modelUrl = extValues.find(a => a.name == 'bpmnModel').value;
					const htmlOverlay = `<a href="https://${modelUrl}" class="djs-overlay djs-overlay-drilldown link-overlay" target="_blank"><i class="fa-solid fa-link"></i></a>`;

					overlays.add(element.id, 'drilldown', {
						position: {
							bottom: 0,
							right: 0,
						},
						html: htmlOverlay,
					});
				} catch (e) {
					console.log('non-breaking error: ');
					console.log(e);
					//Non-breaking errors: continue running
				}
			}
			else if (element.type == 'bpmn:DataStoreReference' || element.type == 'bpmn:DataObjectReference') {
				const extValues = element.businessObject?.extensionElements;
				if(!extValues){
					return;
				}
				const modelUrl = extValues.values.find(a => a.name == 'dataSource').value;
				if (!modelUrl) {
					return;
				}
				const htmlOverlay = `<a href="https://${modelUrl}" class="djs-overlay djs-overlay-drilldown link-overlay" target="_blank"><i class="fa-regular fa-file-lines"></i></a>`;

				let left = element.width;
				let top = element.height + 5;
				if (element.label) {
					left = (element.width + element.label.width) / 2 + 5;
					top = element.height + element.label.height + 5;
				}

				overlays.add(element.id, 'drilldown', {
					position: { left, top },
					html: htmlOverlay,
				});
			}

		});
	}

	protected getAppContainerElement(): JQuery {
		const containerElement = super.getAppContainerElement();
		return containerElement;
	}
}
