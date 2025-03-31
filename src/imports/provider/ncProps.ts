import { isTextFieldEntryEdited } from '@bpmn-io/properties-panel';
import {HtmlEditorComponent, TextComponent} from './ProviderUtil';
import {is, isAny} from 'bpmn-js/lib/util/ModelUtil';
import {} from 'bpmn-js/lib/core';

export default function (element):Array<unknown> {
	const ncProperties = new Array<unknown>();
	console.log(element);

	if(is(element, 'bpmn:Task')){
		ncProperties.push({
			id: 'bpmnModel',
			element,
			label: 'Редактор HTML',
			component: HtmlEditorComponent,
			isEdited: isTextFieldEntryEdited,
		});
	}

	if(is(element, 'bpmn:CallActivity')){
		ncProperties.push({
			id: 'bpmnModel',
			element,
			label: 'Referenced model',
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

