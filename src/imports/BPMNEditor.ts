import Modeler from 'bpmn-js/lib/Modeler';
import Viewer from 'bpmn-js/lib/Viewer';
import {BpmnPropertiesPanelModule, BpmnPropertiesProviderModule} from 'bpmn-js-properties-panel'; //bpmn-js-properties-panel/lib/provider/camunda';
import camundaModdleDescriptor from 'camunda-bpmn-moddle/resources/camunda.json';
import api from './api';
import Editor from './Editor';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js-properties-panel/dist/assets/properties-panel.css';
import 'bpmn-js-properties-panel/dist/assets/element-templates.css';
import './Editor.scss';

import PDFDocument from 'pdfkit';
import blobStream from 'blob-stream';
import SVGtoPDF from 'svg-to-pdfkit';

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

	protected onPrintAsPDF(): void{
		
		var svg = this.getSVG();

		var doc = new PDFDocument({
		  layout: 'landscape',
		  size: [612, 792]
		});
	  
		var stream = doc.pipe(blobStream());
	  
		var title = document.getElementById("camunda-name")?.innerHTML ?? "Diagram";
		doc.fontSize(25).text(title, 10, 10);
	  
		// add diagram as SVG
		SVGtoPDF(doc, svg, 10, 40, {
		  width: doc.page.width - 20,
		  height: doc.page.height - 50,
		  preserveAspectRatio: "xMinYMin meet"
		});
	  
		const canvas = this.modeler.get('canvas');
		var rootelem = canvas.getRootElement();
		var elemReg:Array<object> = this.modeler.get('elementRegistry');
		var subprocesses = elemReg.filter(el => (el as any).type === 'bpmn:SubProcess' && el.hasOwnProperty('layer'));
	  
		for(let i = 0; i<subprocesses.length; i++){
		  canvas.setRootElement(subprocesses[i]);
		  var subsvg= this.getSVG();
	  
		  // Optional: scale sizes (currently unpredictable)
		  var parser = new DOMParser();
	  
		  doc
		  .addPage()
		  .fontSize(25)
		  .text((subprocesses[i]as any).name?? "Subprocess", 10, 10);
		  SVGtoPDF(doc, subsvg, 10, 40, {
			width: doc.page.width - 20,
			height: doc.page.height - 50,
			preserveAspectRatio: "xMinYMin meet"
		  });
		}
	  
		canvas.setRootElement(rootelem);
	  
	  
		// canvas.setContainer(container)
	  
		doc.end();
		stream.on('finish', function () {
		  var pdfurl = stream.toBlobURL('application/pdf');
		  window.open(pdfurl);
		});
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
