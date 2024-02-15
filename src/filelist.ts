import { translate as t } from '@nextcloud/l10n';
import { loadState } from '@nextcloud/initial-state';
import './imports/bootstrap';
import './filelist.scss';
// import {
// 	DefaultType, FileAction, addNewFileMenuEntry, registerFileAction,
// 	File, Permission, getNavigation
// } from '@nextcloud/files'


function bootstrapFileShare() {
	console.log('Bootstrap file share');
	// if (!OCA?.Sharing?.PublicApp) { // This is only available early when used addScript() instead of addInitScript() in Application.php -> NcEventListener.php
	// 	return;
	// }

	//Thanks to : https://github.com/githubkoma/multiboards/blob/main/js/filesintegration/src/index.js

	//"initial state " throwing error here
	const state = loadState<{ permissions: number, nodeType: string, nodeId: number }>('files_bpm', 'share');
	const mimetype = $('#mimetype').val() as string;

	console.log(state);
	console.log(mimetype);


	if (['application/x-bpmn', 'application/x-dmn'].includes(mimetype) && state?.nodeType === 'file') {

		const filename = $('#filename').val();
		const file = {
			name: filename,
			path: '/',
			permissions: state.permissions,
			id: state.nodeId,
		};

		const fileList = {
			setViewerMode: () => undefined,
			showMask: () => undefined,
			hideMask: () => undefined,
			reload: () => Promise.resolve(),
			getDirectoryPermissions: () => 0,
			findFile: () => file,
		};

		if (mimetype === 'application/x-bpmn') {
			startBPMNEditor(file, fileList);
		} else {
			startDMNEditor(file, fileList);
		}
	}


}

// function fixFileIconForFileShare() {
// 	if (!$('#dir').val() && $('#mimetype').val() === 'application/x-bpmn') {
// 		$('#mimetypeIcon').val(OC.imagePath('files_bpm', 'icon-filetypes_bpmn.svg'));
// 	}

// 	if (!$('#dir').val() && $('#mimetype').val() === 'application/x-dmn') {
// 		$('#mimetypeIcon').val(OC.imagePath('files_bpm', 'icon-filetypes_dmn.svg'));
// 	}
// }

function registerFileIcon() {
	if (OC?.MimeType?._mimeTypeIcons) {
		OC.MimeType._mimeTypeIcons['application/x-bpmn'] = OC.imagePath('files_bpm', 'icon-filetypes_bpmn.svg');
		OC.MimeType._mimeTypeIcons['application/x-dmn'] = OC.imagePath('files_bpm', 'icon-filetypes_dmn.svg');
	}
}

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
		editor.start();
	});
}

// bootstrapFileShare();

// fixFileIconForFileShare();



if (parseInt(OC.config.version.substring(0, 2)) >= 28) {

	console.log('in version 28');
	const Mimes = {
		bpmn: {
			mime: 'application/x-bpmn',
			type: 'text',
			css: 'icon-bpmn',
			icon: '',
			newStr: 'New BPMN File',
		},
	};
	bootstrapFileShare();
	// function registerAction(ext, attr) {
	// 	registerFileAction(new FileAction({
	// 		id: 'bpmn',
	// 		displayName() {
	// 			'Open in BPMN Editor'
	// 		},
	// 		enabled(nodes) {
	// 			return nodes.length === 1 && attr.mime === nodes[0].mime && (nodes[0].permissions & OC.PERMISSION_READ) !== 0
	// 		},
	// 		iconSvgInline: () => attr.icon,
	// 		async exec(node, view) {
	// 			//console.log(node, view);
	// 			//console.log(node.fileid, node.token);

	// 			if (!window.OC.getCurrentUser().uid) {
	// 				alert("Not yet implemented.");
	// 			} else {
	// 				var fileId = node.fileid;
	// 				var url = OC.generateUrl('/apps/' + 'multiboards' + '/?fileId=' + fileId); // + '&dir=' + context.dir + '&fileName=' + fileName);                
	// 				window.location.href = url;
	// 			}

	// 		},
	// 		default: DefaultType.HIDDEN
	// 	}));
	// }

	// function addMenuEntry(ext, attr) {
	// 	addNewFileMenuEntry({
	// 		id: 'mboard',
	// 		displayName: attr.newStr,
	// 		enabled() {
	// 			// only attach to main file list, public view is not supported yet
	// 			return getNavigation()?.active?.id === 'files'
	// 		},
	// 		iconClass: attr.css,
	// 		async handler(file, folder) {
	// 			//const contentNames = content.map((node) => node.basename);
	// 			//const fileName = getUniqueName(attr.newStr, ext, contentNames);
	// 			//console.log(file, folder.source, ext, attr);
	// 			//console.log(file.root, file.path, file.name);

	// 			if (!window.OC.getCurrentUser().uid) {
	// 				alert("Not yet implemented.");
	// 			} else {
	// 				var webDavUrl = window.OC.getProtocol() + "://" + window.OC.getHost() + window.OC.getRootPath() + "/remote.php/dav/" + file.root + file.path + "/" + "MultiBoard " + new Date(Date.now()).toUTCString().substring(5) + ".mboard";
	// 				$.ajax({
	// 					url: webDavUrl,
	// 					method: 'PUT',
	// 					headers: { "requesttoken": window.oc_requesttoken },
	// 					data: '{ "nodes": [], "edges": [] }',
	// 					contentType: "application/x-mboard",
	// 					success: function (data) {
	// 						location.reload();
	// 					},
	// 					error: function (e) {
	// 						window.OC.dialogs.message("Error", "Not Created")
	// 					}
	// 				})
	// 			}
	// 		}
	// 	});
	// }

	// for (const ext in Mimes) {
	// 	//console.log(ext, Mimes);
	// 	registerAction(ext, Mimes[ext]);
	// 	addMenuEntry(ext, Mimes[ext]);
	// }
}

else {  // Nextcloud versions lower than 28

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

}
