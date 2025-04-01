import { TextFieldEntry } from '@bpmn-io/properties-panel';
import { useService } from 'bpmn-js-properties-panel';
import ncProps from './ncProps';
import { html } from 'htm/preact';
import Quill from 'quill'; // Убедитесь, что Quill установлен: npm install quill
import 'quill/dist/quill.snow.css'; // Подключаем стили Quill


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
    <div class="html-editor-component">
      <label>${translate(label)}</label>
      <div
        id="quill-editor-${id}"
        style="border: 1px solid #ccc; min-height: 150px;"
        oncreate=${(node) => {
          // Инициализация Quill
          const quill = new Quill(node, {
            theme: 'snow',
            modules: {
              toolbar: [
				['bold', 'italic', 'underline', 'strike'],        // toggled buttons
				['blockquote', 'code-block'],
	  
				[{'header': 1}, {'header': 2}],               // custom button values
				[{'list': 'ordered'}, {'list': 'bullet'}],
				[{'script': 'sub'}, {'script': 'super'}],      // superscript/subscript
				[{'indent': '-1'}, {'indent': '+1'}],          // outdent/indent
				[{'direction': 'rtl'}],                         // text direction
	  
				[{'size': ['small', false, 'large', 'huge']}],  // custom dropdown
				[{'header': [1, 2, 3, 4, 5, 6, false]}],
	  
				[{'color': []}, {'background': []}],          // dropdown with defaults from theme
				[{'font': []}],
				[{'align': []}],
				['link', 'image', 'video'],
	  
				['clean']                                    // remove formatting button
			 ],
            },
          });

          // Установка начального значения
          quill.root.innerHTML = getValue();

          // Слушаем изменения и обновляем модель
          quill.on('text-change', () => {
            const content = quill.root.innerHTML;
            setValue(content);
          });
        }}
      ></div>
    </div>
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
