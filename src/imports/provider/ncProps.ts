import { html } from 'htm/preact';
import { isTextFieldEntryEdited } from '@bpmn-io/properties-panel';
import { TextComponent } from './ProviderUtil';
import {is, isAny} from 'bpmn-js/lib/util/ModelUtil';


export default function (element) {
	const ncProperties = new Array<unknown>();
	if(is(element, 'bpmn:CallActivity')){
		ncProperties.push({
			id: 'bpmnModel',
			element,
			component: TextComponent,
			isEdited: isTextFieldEntryEdited,
		  });
	}
	else if(isAny(element, ['bpmn:DataObjectReference', 'bpmn:DataStoreReference'])){
		ncProperties.push({
			id: 'dataSource',
			element,
			label: 'Data reference url',
			component: TextComponent,
			isEdited: isTextFieldEntryEdited,
		});
	}

	return ncProperties;
}

