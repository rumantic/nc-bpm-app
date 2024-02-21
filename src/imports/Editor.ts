import { translate as t } from '@nextcloud/l10n';
import api from './api';
import './Editor.scss';
import { jsPDF } from 'jspdf';
import 'svg2pdf.js';

export type NextcloudFile = {
	id?: number
	name: string
	path: string
	size?: number
	etag?: string
	permissions: number
	mime?: string
	writeable: boolean
}

export type NextcloudFileList = {
	setViewerMode: (enabled: boolean) => void
	showMask: () => void
	hideMask: () => void
	reload: () => Promise<void>
	getDirectoryPermissions: () => number
	findFile: (fileName: string) => NextcloudFile | null
	shown?: boolean
}

const STATUS_CREATED = 201;
const STATUS_PRECONDITION_FAILED = 412;
const CONTENT_ID = 'bpmn-app';

export default abstract class Editor {
	protected originalUrl: URL;

	protected originalEtag: string;

	protected containerElement: JQuery;

	protected hasUnsavedChanges = false;

	private resizeHandler: (() => void)[] = [];

	constructor(protected file: NextcloudFile, private fileList?: NextcloudFileList) {
		this.originalUrl = new URL(window.location.toString());
		this.originalEtag = file.etag || '';
		this.hasUnsavedChanges = !file.etag && !OCA.Sharing?.PublicApp;

		window.addEventListener('beforeunload', this.onBeforeUnload);
	};

	protected abstract getContent(): Promise<string>;

	protected abstract getSVG(): Promise<string>;

	protected abstract runEditor(): Promise<void>;

	protected abstract destroy(): Promise<void>;

	protected abstract pdfAdditions(pdf: jsPDF): Promise<void>;

	public async start(): Promise<void> {
		this.addEditStateToHistory();
		await this.runEditor();
		this.setAppContainerReady();
		//this.addPropertiesResizeListener();
	}

	private addEditStateToHistory(): void {
		const url = new URL(this.originalUrl.toString());
		url.searchParams.set('openfile', this.file.id?.toString() || 'new');
		url.searchParams.delete('fileid');

		OC.Util.History.pushState(url.searchParams.toString());
	}

	private resetHistoryState(): void {
		const url = new URL(this.originalUrl.toString());

		if (url.searchParams.get('openfile') && this.file.id) {
			url.searchParams.set('fileid', this.file.id.toString());
			url.searchParams.delete('openfile');
		}

		OC.Util.History.pushState(url.searchParams.toString());
	}

	private updateHistoryState(): void {
		const url = new URL(this.originalUrl.toString());
		url.searchParams.set('openfile', this.file.id?.toString() || 'new');
		url.searchParams.delete('fileid');

		OC.Util.History.replaceState(url.searchParams.toString());
	}


	// private addPropertiesResizeListener () {
	// 	const resizeElement = this.containerElement.find('>.bpmn-properties-resizer');
	// 	const propertiesElement = this.containerElement.find('>.bpmn-properties');
	// 	if(this.isFileUpdatable() && resizeElement && propertiesElement) {
	// 		resizeElement.on('mousedown', () => {
	// 			document.addEventListener('mousemove', resize, false);
	// 			document.addEventListener('mouseup', () => {
	// 				document.removeEventListener('mousemove', resize, false);
	// 			}, false);
	// 		});
	// 	}

	// 	const resize = (event: MouseEvent) => {
	// 		event.preventDefault();
	// 		event.stopPropagation();
	// 		const size = `${document.body.clientWidth - event.x}px`;
	// 		propertiesElement.css('flex-basis', size);
	// 	};
	// }

	// private removePropertiesResizeListener () {
	// 	const resizeElement = this.containerElement.find('>.bpmn-properties-resizer');

	// 	if(resizeElement) {
	// 		resizeElement.off('mousedown');
	// 	}
	// }


	protected getAppContainerElement(): JQuery {
		if (!this.containerElement || this.containerElement.length === 0) {

			this.containerElement = $('<div>');
			this.containerElement.attr('id', CONTENT_ID);
			this.containerElement.addClass('icon-loading');
			this.containerElement.attr('data-state', this.hasUnsavedChanges ? 'unsaved' : 'saved');

			const paletteElement = $('<div>');
			paletteElement.addClass('bpmn-palette bpmn-filename');
			paletteElement.attr('data-filename', this.file.name);
			paletteElement.appendTo(this.containerElement);

			const groupElement = $('<div>');
			groupElement.addClass('bpmn-group');
			groupElement.appendTo(paletteElement);

			const oldflag = getComputedStyle(document.body).getPropertyValue('--original-icon-download-dark') == '';

			if (this.isFileUpdatable()) {
				$('<div>')
					.addClass('entry icon-save bpmn-save')
					.attr('role', 'button')
					.on('click', this.clickCallbackFactory(this.onSave, 'icon-save'))
					.appendTo(groupElement);
			}

			const downloadElement = $('<div>')
				.attr('role', 'button')
				.on('click', this.toggleMenu)
				.appendTo(groupElement);

			if (oldflag) {
				downloadElement.addClass('entry icon-download-old');
			} else {
				downloadElement.addClass('entry icon-download');
			}

			$('<ul>')
				.addClass('menu')
				.append($('<li>').addClass('entry icon-image').attr('title', t('files_bpm', 'Export SVG')).on('click', this.clickCallbackFactory(this.onDownloadAsSVG, 'icon-download')))
				.append($('<li>').addClass('entry icon-pdf').attr('title', t('files_bpm', 'Export PDF')).on('click', this.clickCallbackFactory(this.onDownloadAsPDF, 'icon-download')))
				.appendTo(downloadElement);

			if (this.isRealFileList()) {
				const closeBtn = $('<div>')
					.attr('role', 'button')
					.on('click', this.clickCallbackFactory(this.onClose))
					.appendTo(groupElement);
				if (oldflag) {
					closeBtn.addClass('entry icon-close-old bpmn-close');
				} else {
					closeBtn.addClass('entry icon-close bpmn-close');
				}

			}

			const canvasElement = $('<div>');
			canvasElement.addClass('bpmn-canvas');
			canvasElement.appendTo(this.containerElement);

			$('#app-content').append(this.containerElement);
			//$('.app-navigation').addClass('hidden');

			if (this.isFileUpdatable() && this.containerElement.find('>.bpmn-properties').length === 0) {
				// const propertiesResizeElement = $('<div>');
				// propertiesResizeElement.addClass('bpmn-properties-resizer');
				// propertiesResizeElement.appendTo(this.containerElement);

				const propertiesElement = $('<div>');
				propertiesElement.addClass('bpmn-properties');
				propertiesElement.appendTo(this.containerElement);
			}
		}


		return this.containerElement;
	}

	private toggleMenu = (ev: JQuery.ClickEvent) => {
		ev.preventDefault();
		ev.stopPropagation();

		const element = $(ev.currentTarget).find('ul');
		const closeMenu = () => element.removeClass('show');

		if (element.hasClass('show')) {
			$('body').off('click', closeMenu);
		} else {
			$('body').one('click', closeMenu);
		}

		if ($(ev.currentTarget).hasClass('icon-loading') || ev.currentTarget !== ev.target) {
			closeMenu();

			return;
		}

		element.toggleClass('show');
	}

	private setAppContainerReady(): void {
		this.containerElement && this.containerElement.removeClass('icon-loading');
		console.log('app container should be ready');
		$('body').css('overflow', 'hidden');
	}

	// protected addResizeListener(cb: () => void): void {
	// 	let resizeTimeout: number;

	// 	const handler = () => {
	// 		if (resizeTimeout) {
	// 			window.clearTimeout(resizeTimeout);
	// 		}

	// 		resizeTimeout = window.setTimeout(cb, 500);
	// 	};

	// 	this.resizeHandler.push(handler);

	// 	$(window).on('resize', handler);
	// }

	// protected removeResizeListener(cb: () => void): void {
	// 	this.resizeHandler = this.resizeHandler.filter(handler => handler !== cb);
	// }

	protected showLoadingError(errorMessage: string): void {
		const text = t('files_bpm', 'Error while loading diagram: ') + errorMessage;
		const title = t('files_bpm', 'Could not load diagram');

		OC.dialogs.alert(text, title, () => undefined);
	}

	private async onClose() {
		if (this.hasUnsavedChanges && !await this.showConfirmClose()) {
			return;
		}

		if (this.originalEtag !== this.file.etag) {
			await this.fileList?.reload();
		}

		this.destroy();

		if (this.containerElement && this.containerElement.length > 0) {
			this.containerElement.remove();
		}

		this.resetHistoryState();

		//this.removePropertiesResizeListener();

		window.removeEventListener('beforeunload', this.onBeforeUnload);
		window.location.href = OC.generateUrl('/apps/files' + this.file.path); //files/dir=path without files_bpm
	}

	private async onSave() {
		const content = await this.getContent();

		const result = await api.uploadFile(this.file.path, this.file.name, content, this.file.etag);

		if (result.statuscode >= 200 && result.statuscode <= 299) {
			if (result.statuscode === STATUS_CREATED) {
				this.updateFile();
			}

			this.file.etag = result.header.etag;

			this.hasUnsavedChanges = false;
			this.getAppContainerElement().attr('data-state', 'saved');

			return;
		}

		if (result.statuscode === STATUS_PRECONDITION_FAILED) {
			await this.onFileHasChanged(result.header.etag);

			return;
		}

		throw new Error(`Unexpected status code (${result.statuscode}) while uploading file`);
	}

	private async onDownloadAsSVG() {
		const svg = await this.getSVG();
		const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
		const svgUrl = URL.createObjectURL(svgBlob);

		const linkElement = $('<a>').attr('href', svgUrl).attr('download', this.file.name.replace(/\.[^.]+$/, '.svg')).css('visibility', 'hidden');
		linkElement.appendTo('body');
		linkElement.get(0)?.click();
		linkElement.remove();
	}

	private async onDownloadAsPDF() {
		//for printing
		const svgContainer = $('<div>');
		svgContainer.css({
			position: 'fixed',
			bottom: '100%',
		});
		svgContainer.append(await this.getSVG());
		svgContainer.appendTo(this.containerElement);

		const svgElement = svgContainer.find('svg').get(0);
		if (svgElement) {
			//const bounding = svgElement.getBoundingClientRect();
			const pdf = new jsPDF({
				orientation: 'landscape',
				format: 'a4',
				unit: 'pt',
			});//bounding.width > bounding.height ? 'l' : 'p', 'pt', [bounding.width, bounding.height]);
			const title = this.file.name.replace(/\.[^.]+$/, '') ?? 'Diagram';

			pdf.setFontSize(25).text(title, 30, 30);

			try {
				await pdf.svg(svgElement, {
					x: 15,
					y: 30,
					width: 267,
					height: 180,
				}); //nb: width and height are a4 dimensions - 30 mm

				console.log(svgElement);
				await this.pdfAdditions(pdf);

				//modeler-specific additional features (BPMN subprocesses, DMN to be seen)
				await pdf.save(this.file.name.replace(/\.[^.]+$/, '.pdf'), { returnPromise: true });
			} catch (err) {
				svgContainer.remove();

				throw err;
			}
		}

		svgContainer.remove();
	}

	private async onFileHasChanged(serverEtag: string) {
		const title = t('files_bpm', 'File has changed');
		const description = t('files_bpm', 'The file was modified while editing. Do you want to overwrite it, or should your changes be saved with a new filename?');
		const buttons = {
			type: OC.dialogs.YES_NO_BUTTONS,
			confirm: t('files_bpm', 'Overwrite'),
			cancel: t('files_bpm', 'As new file'),
		};

		return new Promise(resolve => {
			OC.dialogs.confirmDestructive(description, title, buttons, (overwrite) => {
				if (overwrite) {
					this.file.etag = serverEtag;
				} else {
					this.file.name = this.generateNewFileName();
					this.file.etag = '';

					this.getAppContainerElement().find('.bpmn-filename').attr('data-filename', this.file.name);
				}

				resolve(this.onSave());
			}, true);
		});
	}

	private async showConfirmClose(): Promise<boolean> {
		return new Promise(resolve => {
			const title = t('files_bpm', 'Discard changes?');
			const description = t('files_bpm', 'You have unsaved changes. Do you really want to close the editor? All your changes will be lost.');
			const buttons = {
				type: OC.dialogs.YES_NO_BUTTONS,
				confirm: t('files_bpm', 'Close editor'),
				cancel: t('files_bpm', 'Abort'),
			};

			OC.dialogs.confirmDestructive(description, title, buttons, resolve, true);
		});
	}

	private clickCallbackFactory = (handler: () => Promise<void>, className?: string) => {
		return (ev: JQuery.ClickEvent<HTMLElement>) => {
			ev.preventDefault();

			const targetElement = $(ev.target).parents('.entry').length > 0 ? $(ev.target).parents('.entry').first() : $(ev.target);

			if (targetElement.hasClass('icon-loading')) {
				return;
			}

			className && targetElement.removeClass(className);
			targetElement.addClass('icon-loading');

			handler.call(this).then(() => {
				targetElement.addClass('icon-checkmark');

				setTimeout(() => {
					targetElement.removeClass('icon-checkmark');

					className && targetElement.addClass(className);
				}, 3000);
			}).catch((error) => {
				console.log('clickCBFactory Error', error);

				OC.dialogs.alert(
					error.toString(),
					t('files_bpm', 'Error'),
					() => undefined
				);

				targetElement.addClass('icon-error');

				setTimeout(() => {
					targetElement.removeClass('icon-error');

					className && targetElement.addClass(className);
				}, 3000);
			}).then(() => {
				targetElement.removeClass('icon-loading');
			});
		};
	}

	private onBeforeUnload = (ev: BeforeUnloadEvent) => {
		if (this.hasUnsavedChanges) {
			const message = t('files_bpm', 'If you leave this page, all your modifications will be lost.');

			ev.preventDefault();
			ev.returnValue = message;

			return message;
		}

		return null;
	}

	private updateFile(): void {
		this.fileList?.reload().then(() => {
			const newFile = this.fileList?.findFile(this.file.name);

			if (newFile && newFile.id !== this.file.id) {
				this.file = newFile;
				this.originalEtag = newFile.etag as string;

				this.updateHistoryState();
			}
			
		});
	}

	private generateNewFileName(): string {
		const nameParts = this.file.name.split('.');
		const tail = nameParts[nameParts.length - 2];

		nameParts[nameParts.length - 2] = tail.replace(/_\d{13}$/, '') + '_' + (new Date()).getTime().toString();

		return nameParts.join('.');
	}

	protected isFileUpdatable(): boolean {
		if (this.file.writeable != null) {
			return this.file.writeable;
		}
		return (this.file.permissions & OC.PERMISSION_UPDATE) !== 0;
	}

	protected isDirectoryWritable(): boolean {
		if (this.fileList)
			return (this.fileList.getDirectoryPermissions() & OC.PERMISSION_CREATE) !== 0;
		else
			return true;
	}

	protected isRealFileList(): boolean {
		if (this.fileList)
			return typeof this.fileList.shown === 'boolean';
		else
			return true;
	}

}
