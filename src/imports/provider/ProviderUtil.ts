import { TextFieldEntry } from '@bpmn-io/properties-panel';
import { useService } from 'bpmn-js-properties-panel';
import ncProps from './ncProps';
import { html } from 'htm/preact';

import 'suneditor/dist/css/suneditor.min.css';
import suneditor from 'suneditor';
import plugins from 'suneditor/src/plugins';

import ru from 'suneditor/src/lang/ru';

function create_editor(value = '') {
	const bio_properties_panel_documentation = document.getElementById('bio-properties-panel-htmlContent');

	window['w-editor'] = suneditor.create('bio-properties-panel-htmlContent', {
		width: '100%',
		height: '400',
		minHeight: '400',
		fullScreenOffset: '50px',
		plugins: plugins,
		buttonList: [
			['undo', 'redo'],
			['fullScreen', 'showBlocks', 'codeView'],
			['font', 'fontSize', 'formatBlock'],
			['paragraphStyle', 'blockquote'],
			['bold', 'underline', 'italic', 'strike', 'subscript', 'superscript'],
			['fontColor', 'hiliteColor', 'textStyle'],
			['removeFormat'],
			'/', // Line break
			['outdent', 'indent'],
			['align', 'horizontalRule', 'list', 'lineHeight'],
			['table', 'link', 'image', 'video', 'audio' /** ,'math' */], // You must add the 'katex' library at options to use the 'math' plugin.
			/** ['imageGallery'] */ // You must add the "imageGalleryUrl".
			['preview', 'print'],
			/** ['dir', 'dir_ltr', 'dir_rtl'] */ // "dir": Toggle text direction, "dir_ltr": Right to Left, "dir_rtl": Left to Right
		],
		lang: ru,
	});

	// Устанавливаем начальное значение
	window['w-editor'].setContents(value);

	// Слушаем изменения и вызываем setValue
	window['w-editor'].onChange = (content: string) => {
		const event = new Event('input', {
			bubbles: true,
			cancelable: true,
		});

		// Отправляем событие на textarea
		if ( bio_properties_panel_documentation ) {
			bio_properties_panel_documentation.dispatchEvent(event);
		}
	};

}

//TODO: import types from bpmn.io?
export function getProperty(businessObject, type: string):any {
	if (!businessObject.extensionElements) {
		return;
	}
	else if (!businessObject.extensionElements.values) {
		businessObject.extensionElements.values = [];
		return;
	}
	return businessObject.extensionElements.values.filter((extensionElement) => {
		return extensionElement.name == type;
	})[0];
}



// Create the custom group
export function createGroup(element, translate) {

	// create a group for properties
	const group = {
		id: 'nc',
		label: translate('Properties'),
		entries: ncProps(element),
	};

	return group;
}

export function TextComponent(props: any):TextFieldEntry {
	const prev_element_id = window['prev_element_id'];
	let needRestartEditor = false;
	const { element, id } = props;
	const modeling = useService('modeling');
	const translate = useService('translate');
	const debounce = useService('debounceInput');
	const moddle = useService('moddle');

	const getValue = () => {
		if (window['w-editor'] && typeof window['w-editor'].getContents === 'function' ) {
			if ( prev_element_id !== element.id) {
				window['w-editor'].destroy();
				needRestartEditor = true;
			}
		} else {
			needRestartEditor = true;
		}

		const ext = element.businessObject.extensionElements;
		if (!ext) {
			if ( needRestartEditor ) {
				window['prev_element_id'] = element.id;
				setTimeout(() => {
					console.log('после паузы');
					create_editor('');
				}, 1000);
			}
			return [];
		}
		const prop = getProperty(element.businessObject, id);
		if (!prop || prop.length < 1) {
			if ( needRestartEditor ) {
				window['prev_element_id'] = element.id;
				setTimeout(() => {
					console.log('после паузы');
					create_editor('');
				}, 1000);
			}

			return [];
		}

		if ( needRestartEditor ) {
			window['prev_element_id'] = element.id;
			setTimeout(() => {
				create_editor(prop.value);
			}, 1000);
		} else {
		}
		return prop.value;
	};

	const setValue = value => {
		const extensionElements = element.businessObject.extensionElements || moddle.create('bpmn:ExtensionElements');
		let prop = getProperty(element.businessObject, id);
		if (!prop) {
			prop = moddle.create('nc:property', { name: id, value: value });
			extensionElements.get('values').push(prop);
		}

		if (window['w-editor'] && typeof window['w-editor'].getContents === 'function' ) {
			prop.value = window['w-editor'].getContents();
		} else {
			prop.value = value;
		}

		return modeling.updateProperties(element, {
			extensionElements,
		});
	};

	const label = props.label ?? id;
	return html`<${TextFieldEntry}
	    id=${id}
	    element=${element}
	    label=${translate(label)}
	    getValue=${getValue}
	    setValue=${setValue}
	    debounce=${debounce}
	  />`;
}
