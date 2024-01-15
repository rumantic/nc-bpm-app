import api from './api';
import Editor from './Editor';
import { jsPDF } from 'jspdf';
import * as DmnEditor from "@kogito-tooling/kie-editors-standalone/dist/dmn"


declare type DMNModeler = {
	destroy(): void,
	subscribeToContentChanges(callback: (isDirty: boolean) => void): (isDirty: boolean) => void
	getContent(): Promise<string>
	setContent(path: string, content: string): Promise<{ warnings: string[] }>
	getPreview(): Promise<string>
}

export default class DMNEditor extends Editor {
	private modeler: DMNModeler;
	protected getContent(): Promise<string> {
		if (this.modeler) {
			return this.modeler.getContent();
		}

		if (this.file.etag || OCA.Sharing?.PublicApp) {
			return api.getFileContent(this.file.path, this.file.name);
		}

		return Promise.resolve("");
	}

	protected async getSVG(): Promise<string> {
		if (this.modeler) {
			return this.modeler.getPreview();
		}

		throw new Error('Modeler not loaded');
	}

	protected async destroy(): Promise<void> {
		this.modeler && this.modeler.destroy();

		//this.removeResizeListener(this.onResize);
	}

	protected async pdfAdditions(pdf: jsPDF): Promise<void> {
		console.log('No additions yet');
	}
	protected async runEditor(): Promise<void> {
		const dmnXML = await this.getContent();
		const modeler = this.getModeler();
		try {
			await modeler.setContent('diagram', dmnXML);
			//this.addResizeListener(this.onResize);
			this.attachChangeListener();
		} catch (err) {
			this.showLoadingError(err.toString());
		}
	}

	// private onResize = () => {
	// 	this.modeler && this.modeler.resized();
	// }

	private getModeler() {
		if (!this.modeler) {
			const containerElement = this.getAppContainerElement();
			const canvasElement = containerElement.find('.bpmn-canvas').get(0);
			if (!canvasElement) {
				throw new Error('Modeler not loaded');
			}
			const propertiesElement = containerElement.find('.bpmn-properties');

			this.modeler = this.isFileUpdatable() ? DmnEditor.open({
				container: canvasElement!,
				initialContent: Promise.resolve(""),
				readOnly: false,
			}) : DmnEditor.open({
				container: canvasElement!,
				initialContent: Promise.resolve(""), //TODO CHANGE
				readOnly: true,
			});
			this.modeler.subscribeToContentChanges(
				function (...args) {
					console.log('view changed', args);
				}
			);
			
			console.log(this.modeler);

			// this.modeler.on('viewer.created', function (...args) {
			// 	console.log('viewer.created', args);
			// });
		}

		return this.modeler;
	}


	private attachChangeListener() {

		if (!this.modeler) {
			return;
		}

		const containerElement = this.getAppContainerElement();

		this.modeler.subscribeToContentChanges(() => {
			if (!this.hasUnsavedChanges) {
				this.hasUnsavedChanges = true;

				containerElement.attr('data-state', 'unsaved');
			}
		});
		// this.modeler.on('element.changed', () => {
		// 	if (!this.hasUnsavedChanges) {
		// 		this.hasUnsavedChanges = true;

		// 		containerElement.attr('data-state', 'unsaved');
		// 	}
		// });


	}

	protected getAppContainerElement(): JQuery {
		const containerElement = super.getAppContainerElement();
		return containerElement;
	}
}