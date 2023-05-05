import Modeler from 'bpmn-js/lib/Modeler';
import Viewer from 'bpmn-js/lib/Viewer';
import { BpmnPropertiesPanelModule, BpmnPropertiesProviderModule } from 'bpmn-js-properties-panel'; //bpmn-js-properties-panel/lib/provider/camunda';
import camundaModdleDescriptor from 'camunda-bpmn-moddle/resources/camunda.json';
import api from './api';
import Editor from './Editor';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js-properties-panel/dist/assets/properties-panel.css';
import 'bpmn-js-properties-panel/dist/assets/element-templates.css';
import './Editor.scss';
import {jsPDF} from 'jspdf';

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
			if(subsvg){
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
	protected async runEditor(): Promise<void> {
		const bpmnXML = await this.getContent();
		const modeler = this.getModeler();
		try {
			await modeler.importXML(bpmnXML);
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
				],
				propertiesPanel: {
					parent: propertiesElement,
					layout: {
						open: true,
						groups: {
							general: { open: true },
							documentation: { open: true },
						},
					},
				},
				moddleExtensions: {
					camunda: camundaModdleDescriptor,
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

	protected getAppContainerElement(): JQuery {
		const containerElement = super.getAppContainerElement();
		return containerElement;
	}
}
