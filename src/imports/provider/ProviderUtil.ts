import { TextFieldEntry } from '@bpmn-io/properties-panel';
import { useService } from 'bpmn-js-properties-panel';
import ncProps from './ncProps';
import { html } from 'htm/preact';

import 'suneditor/dist/css/suneditor.min.css';
//import 'suneditor/assets/css/suneditor.css';
//import 'suneditor/assets/css/suneditor-contents.css';
import suneditor from 'suneditor';

// How to import plugins
import list from 'suneditor/src/plugins/submenu/list';
import {font, video, image} from 'suneditor/src/plugins';

// How to import language files (default: en)
import lang from 'suneditor/src/lang';
import hooks from '@bpmn-io/properties-panel/preact/hooks';
import minDash from 'min-dash';
import jsxRuntime from '@bpmn-io/properties-panel/preact/jsx-runtime';
// import ru from 'suneditor/src/lang/ru';

// Кастомный элемент!
class WysiwygEditorElement extends HTMLElement {
	private editor: any;
	private shadowElement: any;
	private bpm_id: any;
	private bio_properties_panel_documentation: any;
	public label: string; // Свойство для хранения переданной метки
	public element: any;
	public getValue: any;
	public setValue: any;

	//private moddle = useService('moddle');
	//private modeling = useService('modeling');

	/*
	getValue = () => {
		const ext = this.shadowElement.businessObject.extensionElements;
		if (!ext) {
			return '';
		}
		const prop = getProperty(this.shadowElement.businessObject, this.bpm_id);
		if (!prop) {
			return '';
		}
		return prop.value;
	};

	setValue = (value: string) => {
		const extensionElements = this.shadowElement.businessObject.extensionElements;
		let prop = getProperty(this.shadowElement.businessObject, this.bpm_id);
		prop.value = value;
		console.log(prop);
		console.log(extensionElements);

		//return this.modeling.updateProperties(this.shadowElement, {
		//	extensionElements,
		//});
	};
	 */

	constructor() {
		super();  // вызываем конструктор родительского класса
	}

	// Метод для инициализации компонента
	connectedCallback() {
		// Создаем контейнер для редактора
		this.innerHTML = `
      <div class="bio-properties-panel-entry">
        <textarea id="editor-container"></textarea>
      </div>
    `;
		this.bpm_id = this.getAttribute('bpm_id');
		this.shadowElement = this.shadowRoot?.getElementById(this.bpm_id);

		//const functions = window[this.bpm_id];

		this.getValue = window['testGetValue'];
		this.setValue = window['testSetValue'];

		this.bio_properties_panel_documentation = document.getElementById('bio-properties-panel-documentation');
		console.log('bio_properties_panel_documentation');
		console.log(this.bio_properties_panel_documentation);


		// this.shadowElement = document.getElementById(this.bpm_id);

		// Инициализируем TinyMCE
		this.initializeEditor();

		console.log('label ->');
		console.log(this.getAttribute('label'));
		console.log('< - label');

		console.log('this.element ->');
		console.log(this.element);
		console.log(this.getAttribute('element'));
		console.log('< - this.element');

		console.log('d element ->');
		console.log(document.getElementById(this.bpm_id));
		console.log('< - d element');

		console.log('element ->');
		console.log(this.shadowElement);
		console.log('< - element');
		console.log('bpm id...');
		console.log(this.bpm_id);
		console.log('...bpm id');
	}

	initializeEditor() {
		console.log('initializeEditor');
		console.log('functions');
		console.log(this.getValue);
		console.log(this.setValue);
		console.log('end list');
		this.editor = suneditor.create('editor-container', {
			width: '100%',
			plugins: [font, video, image, list],
			buttonList: [
				['font', 'video', 'image', 'list'],
			],
			lang: lang.ru,
		});

		// Устанавливаем начальное значение
		this.editor.setContents(this.bio_properties_panel_documentation.value);
		const event = new Event('input', {
			bubbles: true,
			cancelable: true,
		});

		// Отправляем событие на textarea
		this.bio_properties_panel_documentation.dispatchEvent(event);

		// Слушаем изменения и вызываем setValue
		this.editor.onChange = (content: string) => {
			this.bio_properties_panel_documentation.value = content;
			//this.setValue(content);
		};
	}

	// Очистка и уничтожение редактора при удалении элемента из DOM
	disconnectedCallback() {
		if (this.editor) {
			//this.editor.remove();
		}
	}
}
// Регистрируем кастомный элемент
customElements.define('wysiwyg-editor-element', WysiwygEditorElement);


export function HtmlEditorComponent(props: any): any {
	const { element, id } = props;

	console.log('for element...');
	console.log(element);
	console.log('...for element');

	console.log('id...');
	console.log(id);
	console.log('...id');

	const modeling = useService('modeling');
	const translate = useService('translate');
	const moddle = useService('moddle');
	const debounce = useService('debounceInput');


	const getValue = () => {
		console.log('getValue = ');
		return 'test';

		/*
		const ext = element.businessObject.extensionElements;
		if (!ext) {
			return '';
		}
		const prop = getProperty(element.businessObject, id);
		if (!prop) {
			return '';
		}
		console.log(prop.value);
		return prop.value;
		 */
	};

	const setValue = (value: string) => {
		console.log('setValue = ');

		const extensionElements = element.businessObject.extensionElements || moddle.create('bpmn:ExtensionElements');
		let prop = getProperty(element.businessObject, id);
		if (!prop) {
			prop = moddle.create('nc:property', { name: id, value: value });
			extensionElements.get('values').push(prop);
		}
		prop.value = value;

		console.log(prop.value);

		return modeling.updateProperties(element, {
			extensionElements,
		});
	};

	const label = props.label ?? id;


	console.log(getValue);
	console.log(setValue);

	window['testGetValue'] = getValue;
	window['testSetValue'] = setValue;


	return html`
		<wysiwyg-editor-element
	    id=${id}
		bpm_id=${element.id}
	    label=${translate(label)}
	    debounce=${debounce}
		/>
	`;

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
		label: translate('Nextcloud properties'),
		entries: ncProps(element),
	};

	return group;
}

export function TextComponent(props: any):TextFieldEntry {
	const { element, id } = props;

	const modeling = useService('modeling');
	const translate = useService('translate');
	const debounce = useService('debounceInput');
	const moddle = useService('moddle');

	const getValue = () => {
		const ext = element.businessObject.extensionElements;
		if (!ext) {
			return [];
		}
		const prop = getProperty(element.businessObject, id);
		if (!prop || prop.length < 1) {
			return [];
		}
		return prop.value;
		//return element.businessObject.nameDE || '';
	};

	const setValue = value => {
		const extensionElements = element.businessObject.extensionElements || moddle.create('bpmn:ExtensionElements');
		let prop = getProperty(element.businessObject, id);
		if (!prop) {
			prop = moddle.create('nc:property', { name: id, value: value });
			extensionElements.get('values').push(prop);
		}
		prop.value = value;

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
