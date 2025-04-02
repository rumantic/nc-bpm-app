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
// import ru from 'suneditor/src/lang/ru';

// Кастомный элемент!
class WysiwygEditorElement extends HTMLElement {
	private editor: any;
	public element: any; // Свойство для хранения переданного элемента
	public label: string; // Свойство для хранения переданной метки
	public getValue: () => string; // Свойство для функции получения значения
	public setValue: (value: string) => void; // Свойство для функции установки значения

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
		// Инициализируем TinyMCE
		this.initializeEditor();
		console.log('element ->');
		this.element = this.getAttribute('element');
		console.log(this.element);
		console.log(this.element.businessObject.extensionElements);
		console.log(this.getAttribute('element'));
		console.log('<- element');
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
		this.editor.setContents(this.getValue);

		// Слушаем изменения и вызываем setValue
		this.editor.onChange = (content: string) => {
			this.setValue(content);
		};
	}

	// Очистка и уничтожение редактора при удалении элемента из DOM
	disconnectedCallback() {
		if (this.editor) {
			this.editor.remove();
		}
	}
}
// Регистрируем кастомный элемент
customElements.define('wysiwyg-editor-element', WysiwygEditorElement);

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

export function HtmlEditorComponent(props: any): any {
	const { element, id } = props;

	const modeling = useService('modeling');
	const translate = useService('translate');
	const moddle = useService('moddle');
	const debounce = useService('debounceInput');


	const getValue = () => {
		const ext = element.businessObject.extensionElements;
		if (!ext) {
			return '';
		}
		const prop = getProperty(element.businessObject, id);
		if (!prop) {
			return '';
		}
		return prop.value;
	};

	const setValue = (value: string) => {
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


	console.log(getValue);
	console.log(setValue);


	return html`
		<wysiwyg-editor-element
	    id=${id}
	    element=${element}
	    label=${translate(label)}
	    getValue=${getValue}
	    setValue=${setValue}
	    debounce=${debounce}
		>
		</wysiwyg-editor-element>
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
