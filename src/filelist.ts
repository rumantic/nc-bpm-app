import { translate as t } from '@nextcloud/l10n';
import { loadState } from '@nextcloud/initial-state';
import './imports/bootstrap';


import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import 'bpmn-js/dist/assets/bpmn-js.css';

import '@fortawesome/fontawesome-free/js/all.js';
import '@fortawesome/fontawesome-free/js/solid.js';

import './imports/Editor.scss';
import './imports/BPMNEditor';
import './imports/DMNEditor';
import './imports/Editor';

import {
	DefaultType, FileAction, addNewFileMenuEntry, registerFileAction,
	getNavigation
} from '@nextcloud/files'

import './imports/Editor.scss';
import './filelist.scss';

const bpmnicon = require('!!svg-inline-loader!./../img/icon-filetypes_bpmn.svg')
const dmnicon = require('!!svg-inline-loader!./../img/icon-filetypes_dmn.svg')

function bootstrapFileShare() {
	//called once on page load
	if (!OCA?.Sharing?.PublicApp) {
		return;
	}

}

function fixFileIconForFileShare() {
	if (!$('#dir').val() && $('#mimetype').val() === 'application/x-bpmn') {
		$('#mimetypeIcon').val(bpmnicon); //OC.imagePath('files_bpm', 'icon-filetypes_bpmn.svg'));
	}

	if (!$('#dir').val() && $('#mimetype').val() === 'application/x-dmn') {
		$('#mimetypeIcon').val(dmnicon);//OC.imagePath('files_bpm', 'icon-filetypes_dmn.svg'));
	}
}

function registerFileIcon() {
	console.log(OC.MimeType);
	console.log(OC.MimeType._mimeTypeIcons)
	if (OC?.MimeType?._mimeTypeIcons) {
		OC.MimeType._mimeTypeIcons['application/x-bpmn'] = OC.imagePath('files_bpm', 'icon-filetypes_bpmn.svg');
		OC.MimeType._mimeTypeIcons['application/x-dmn'] = OC.imagePath('files_bpm', 'icon-filetypes_dmn.svg');
	}
}



if (parseInt(OC.config.version.substring(0, 2)) >= 28) {
	//Thanks to : https://github.com/githubkoma/multiboards/blob/main/js/filesintegration/src/index.js
	const Mimes = {
		bpmn: {
			mime: 'application/x-bpmn',
			type: 'text',
			css: 'icon-filetype-bpmn',
			icon: bpmnicon,//'../img/icon-filetypes_bpmn.svg',
			newStr: 'New BPMN File',
		},
		dmn: {
			mime: 'application/x-dmn',
			type: 'text',
			css: 'icon-filetype-dmn',
			icon: dmnicon, //OC.imagePath('files_bpm', 'icon-filetypes_bpmn.svg'),
			newStr: 'New DMN File',
		},
	};
	registerFileIcon();

	function registerAction(ext, attr) {
		registerFileAction(new FileAction({
			id: ext,
			displayName() {
				return 'Open in ' + ext.toUpperCase() + ' Editor'
			},
			enabled(nodes) {
				return nodes.length === 1 && attr.mime === nodes[0].mime && (nodes[0].permissions & OC.PERMISSION_READ) !== 0
			},
			iconSvgInline: () => attr.icon,
			async exec(file, view) {

				if (!window.OC.getCurrentUser().uid) {
					alert("Not yet implemented.");
					return false;
				} else {

					var dirName = file.dirname;

					var url = OC.generateUrl('/apps/' + 'files_bpm/?' + 'dir=' + dirName + '&fileId='+file.fileid);
					window.location.href = url;

					return true;
				}

			},
			default: DefaultType.HIDDEN
		}));
	}

	function addMenuEntry(ext, attr) {
		addNewFileMenuEntry({
			id: ext,
			displayName: attr.newStr,
			enabled() {
				// only attach to main file list, public view is not supported yet
				return getNavigation()?.active?.id === 'files'
			},
			iconSvgInline: attr.icon,
			async handler(folder, contents) {
				//Generate new BPMN/DMN diagram
				if (!window.OC.getCurrentUser().uid) {
					alert("Not yet implemented.");
				} else {
					var url = OC.generateUrl('/apps/' + 'files_bpm/?' + 'dir=' + folder.path +'&ext='+ext);
					window.location.href = url;
					return true;
				}
			}
		});
	}

	for (const ext in Mimes) {
		registerAction(ext, Mimes[ext]);
		
		addMenuEntry(ext, Mimes[ext]);
	}
}

else {  // Nextcloud versions lower than 28
	function startBPMNEditor(file, fileList) {
		import(/* webpackChunkName: "bpmn-editor" */ './imports/BPMNEditor').then(({ default: Editor }) => {
			const editor = new Editor(file, fileList);
			console.log('Starting BPMN editor');
			editor.start();
		});
	}
	
	function startDMNEditor(file, fileList) {
		import(/* webpackChunkName: "dmn-editor" */ './imports/DMNEditor').then(({ default: Editor }) => {
			const editor = new Editor(file, fileList);
			console.log('Starting DMN editor');
			editor.start();
		});
	}
	
	const BpmFileMenuPlugin = {
		attach: function (menu) {
			menu.addMenuEntry({
				id: 'bpmn',
				displayName: t('files_bpm', 'New BPMN diagram'),
				templateName: 'diagram.bpmn',
				iconClass: 'icon-filetype-bpmn',
				fileType: 'file',
				actionHandler(fileName: string) {
					
					const fileList = menu.fileList;
					const file = {
						name: fileName,
						path: fileList.getCurrentDirectory(),
						permissions: OC.PERMISSION_CREATE | OC.PERMISSION_UPDATE,
					};

					startBPMNEditor(file, fileList);
				},
			});

			menu.addMenuEntry({
				id: 'dmn',
				displayName: t('files_bpm', 'New DMN diagram'),
				templateName: 'diagram.dmn',
				iconClass: 'icon-filetype-dmn',
				fileType: 'file',
				actionHandler(fileName: string) {
					const fileList = menu.fileList;

					const file = {
						name: fileName,
						path: fileList.getCurrentDirectory(),
						permissions: OC.PERMISSION_CREATE | OC.PERMISSION_UPDATE,
					};

					startDMNEditor(file, fileList);
				},
			});
		},
	};

	OC.Plugins.register('OCA.Files.NewFileMenu', BpmFileMenuPlugin);

	const BpmFileListPlugin = {
		ignoreLists: [
			'trashbin',
		],

		attach(fileList) {
			registerFileIcon();

			if (this.ignoreLists.includes(fileList.id)) {
				return;
			}

			fileList.fileActions.registerAction({
				name: 'bpmn',
				displayName: t('files_bpm', 'BPMN diagram'),
				mime: 'application/x-bpmn',
				icon: OC.imagePath('files_bpm', 'icon-filetypes_bpmn.svg'),
				permissions: OC.PERMISSION_READ,
				actionHandler(fileName: string, context) {
					const file = context.fileList.elementToFile(context.$file);

					startBPMNEditor(file, context.fileList);
				},
			});

			fileList.fileActions.setDefault('application/x-bpmn', 'bpmn');

			fileList.fileActions.registerAction({
				name: 'dmn',
				displayName: t('files_bpm', 'DMN diagram'),
				mime: 'application/x-dmn',
				icon: OC.imagePath('files_bpm', 'icon-filetypes_dmn.svg'),
				permissions: OC.PERMISSION_READ,
				actionHandler(fileName: string, context) {
					const file = context.fileList.elementToFile(context.$file);

					startDMNEditor(file, context.fileList);
				},
			});

			fileList.fileActions.setDefault('application/x-dmn', 'dmn');
		},
	};

	OC.Plugins.register('OCA.Files.FileList', BpmFileListPlugin);
	bootstrapFileShare();
	fixFileIconForFileShare();

}

bootstrapFileShare();
fixFileIconForFileShare();

