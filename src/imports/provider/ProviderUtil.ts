import { TextFieldEntry } from '@bpmn-io/properties-panel';
import { useService } from 'bpmn-js-properties-panel';
import ncProps from './ncProps';
import { html } from 'htm/preact';

import 'suneditor/dist/css/suneditor.min.css';
import suneditor from 'suneditor';
import plugins from 'suneditor/src/plugins';

import ru from 'suneditor/src/lang/ru';

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


	constructor() {
		super();  // вызываем конструктор родительского класса
	}

	// Метод для инициализации компонента
	connectedCallback() {
		// Создаем контейнер для редактора
		this.innerHTML = `
      <div class="bio-properties-panel-entry">
        <textarea id="w-editor-container"></textarea>
      </div>
    `;
		this.bpm_id = this.getAttribute('bpm_id');

		// Инициализируем TinyMCE
		this.initializeEditor();

		console.log('bpm id...');
		console.log(this.bpm_id);
		console.log('...bpm id');
	}

	initializeEditor() {
		this.bio_properties_panel_documentation = document.getElementById('bio-properties-panel-documentation');
		console.log('bio_properties_panel_documentation');
		console.log(this.bio_properties_panel_documentation);

		window['w-editor'] = suneditor.create('w-editor-container', {
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
				['save', 'template'],
				/** ['dir', 'dir_ltr', 'dir_rtl'] */ // "dir": Toggle text direction, "dir_ltr": Right to Left, "dir_rtl": Left to Right
			],
			lang: ru,
		});

		console.log('Устанавливаем начальное значение');
		console.log(this.bio_properties_panel_documentation.value);

		// Устанавливаем начальное значение
		window['w-editor'].setContents(this.bio_properties_panel_documentation.value);

		// Слушаем изменения и вызываем setValue
		window['w-editor'].onChange = (content: string) => {
			this.bio_properties_panel_documentation.value = content;
			const event = new Event('input', {
				bubbles: true,
				cancelable: true,
			});

			// Отправляем событие на textarea
			this.bio_properties_panel_documentation.dispatchEvent(event);

			//this.setValue(content);
		};
	}

	// Очистка и уничтожение редактора при удалении элемента из DOM
	disconnectedCallback() {
		console.log('disconnectedCallback');
		if (window['w-editor']) {
			window['w-editor'].destroy();
			console.log('destroy');
		}
	}
}

// Регистрируем кастомный элемент
customElements.define('wysiwyg-editor-element', WysiwygEditorElement);

export function HtmlEditorComponent(props: any): any {
	const { element, id } = props;

	const myId = 'w-editor-container';
	const bio_properties_panel_documentation =
		document.getElementById('bio-properties-panel-documentation')  as HTMLTextAreaElement;

	if (window['w-editor'] && typeof window['w-editor'].setContents === 'function' && bio_properties_panel_documentation.value !== '') {
		console.log('documentation text = ');
		console.log(bio_properties_panel_documentation.value);
		console.log('editor text = ');
		//console.log(window['w-editor'].getContents());

		const wysiwygElement = document.getElementById(myId);
		if (wysiwygElement) {
			// wysiwygElement.remove(); // Удаляет элемент из DOM и вызывает disconnectedCallback
			console.log('wysiwyg-editor-element есть в DOM');
		} else {
			console.error('wysiwyg-editor-element не найден');
		}

		if ( window['w-editor'].getContents() !== bio_properties_panel_documentation.value) {
			// window['w-editor'].destroy();
			// window['w-editor'].setContents(bio_properties_panel_documentation.value);
		}

		// window['w-editor'].setContents(bio_properties_panel_documentation.value);
	}
	console.log('for element...');
	console.log(element);
	console.log('...for element');

	console.log('id...');
	console.log(myId);
	console.log('...id');

	const modeling = useService('modeling');
	const translate = useService('translate');
	const moddle = useService('moddle');
	const debounce = useService('debounceInput');

	const label = props.label ?? myId;

	return html`
		<wysiwyg-editor-element
	    id=${myId}
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
