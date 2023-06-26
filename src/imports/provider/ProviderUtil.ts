import { TextFieldEntry } from '@bpmn-io/properties-panel';
import { useService } from 'bpmn-js-properties-panel';
import ncProps from './ncProps';
import { html } from 'htm/preact';
export function TextComponent(props):TextFieldEntry {
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
	// return TextFieldEntry(
	// 	{ id:id,
	// 		element,
	// 		label: translate(label),
	// 		getValue,
	// 		setValue,
	// 		debounce,
	// 	}
	// );
	return html`<${TextFieldEntry}
	    id=${id}
	    element=${element}
	    label=${translate(label)}
	    getValue=${getValue}
	    setValue=${setValue}
	    debounce=${debounce}
	  />`;
}

export function getProperty(businessObject, type) {
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
//helper for formatting
function _toUpper(phrase) {

	return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}

//Takes camel case string, returns
// thisNewString -> "This New String"
//Don't use rn., throws error!
function prettyLabel(camelCase) {
	const words = camelCase.split(/(?=[A-Z])/);
	const first = words[0];
	let prettyout = '';

	prettyout = first[0].toUpperCase() + first.substring(1, first.length);

	for (let i = 1; i < words.length; i++) {
		//If previous character is uppercase, i.e. if we're in the middle of an acronym

		if (prettyout[prettyout.length - 1] == prettyout[prettyout.length - 1].toUpperCase()) {
			prettyout += words[i];
		}
		else {
			prettyout += ' ' + words[i];
		}
	}

	return prettyout;
}