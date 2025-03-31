import { TextFieldEntry } from '@bpmn-io/properties-panel';
import { useService } from 'bpmn-js-properties-panel';
import ncProps from './ncProps';
import { html } from 'htm/preact';
// Импортируем TinyMCE
import tinymce from 'tinymce';
// Подключаем необходимые модули TinyMCE (опционально)
import 'tinymce/themes/silver';
import 'tinymce/plugins/advlist';
import 'tinymce/plugins/autolink';
import 'tinymce/plugins/lists';
import 'tinymce/plugins/link';
import 'tinymce/plugins/image';

// Кастомный элемент
class WysiwygEditorElement extends HTMLElement {
	private editor: any;

	constructor() {
		super();  // вызываем конструктор родительского класса
	}

	// Метод для инициализации компонента
	connectedCallback() {
		// Создаем контейнер для редактора
		this.innerHTML = `
      <div class="bio-properties-panel-entry">
        <textarea id="editor"></textarea>
      </div>
    `;

		// Инициализируем TinyMCE
		this.initTinyMCE();
	}

	// Метод для инициализации TinyMCE
	initTinyMCE() {
		if (tinymce) {
			tinymce.init({
				selector: '#editor', // выбираем textarea по id
				menubar: true, // отключаем меню
				plugins: 'lists link image table code fullscreen',
				toolbar: 'link image | fullscreen | undo redo | bold italic | alignleft aligncenter alignright | bullist numlist outdent indent',
				setup: (editor: any) => {
					this.editor = editor;
					editor.on('FullscreenStateChanged', (e) => {
						const fullscreenElement = document.querySelector('.tox-editor-container') as HTMLElement; // Cast to HTMLElement
						if (e.state && fullscreenElement) {
							// Apply custom styles dynamically
							fullscreenElement.style.position = 'fixed';
							fullscreenElement.style.top = '100px';
							fullscreenElement.style.left = '100px';
							fullscreenElement.style.right = '100px';
							fullscreenElement.style.bottom = '100px';
							fullscreenElement.style.width = 'calc(100% - 200px)'; // Adjust width dynamically
							fullscreenElement.style.height = 'calc(100% - 200px)'; // Adjust height dynamically
							fullscreenElement.style.backgroundColor = 'white'; // Optional: Set a background color
							fullscreenElement.style.zIndex = '10000'; // Ensure it stays on top
							fullscreenElement.style.border = '1px solid #ccc'; // Add a gray border
							fullscreenElement.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)'; // Add a subtle shadow
						} else if (fullscreenElement) {
							// Reset styles when exiting fullscreen
							fullscreenElement.style.position = '';
							fullscreenElement.style.top = '';
							fullscreenElement.style.left = '';
							fullscreenElement.style.right = '';
							fullscreenElement.style.bottom = '';
							fullscreenElement.style.width = '';
							fullscreenElement.style.height = '';
							fullscreenElement.style.backgroundColor = '';
							fullscreenElement.style.zIndex = '';
							fullscreenElement.style.border = '';
							fullscreenElement.style.boxShadow = '';
						}
					});
				},
				base_url: '/custom_apps/files_bpm/tinymce', // Adjust this path if necessary
				// Enable image uploads
				images_upload_url: '/index.php/apps/files/api/v1/upload', // Nextcloud upload endpoint
				automatic_uploads: true,
				images_upload_credentials: true, // Send cookies with the request for authentication
				file_picker_types: 'image',
				file_picker_callback: (callback, value, meta) => {
					// Custom file picker for Nextcloud
					const input = document.createElement('input');
					input.setAttribute('type', 'file');
					input.setAttribute('accept', 'image/*');
					input.onchange = (event) => {
						const file = (event.target as HTMLInputElement).files?.[0];
						if (file) {
							const formData = new FormData();
							formData.append('file', file);

							// Perform the upload to Nextcloud
							fetch('/index.php/apps/files/api/v1/upload', {
								method: 'POST',
								body: formData,
								credentials: 'include', // Include cookies for authentication
							})
								.then((response) => response.json())
								.then((data) => {
									// Pass the uploaded image URL to TinyMCE
									callback(data.url);
								})
								.catch((error) => {
									console.error('Image upload failed:', error);
								});
						}
					};
					input.click();
				},

			});
		}
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
