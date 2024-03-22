import { generateRemoteUrl, getRootUrl } from '@nextcloud/router';
import axios from '@nextcloud/axios';
import {generateUrl} from '@nextcloud/router';

import { File } from '@nextcloud/files'
import { NextcloudFile } from './Editor';

class Api {
	public async checkPreviewServer(serverUrl: string): Promise<'success' | 'invalid-url'> {
		const url = OC.generateUrl('apps/files_bpm/preview/check');
		const response = await axios.post(url, { url: serverUrl });

		return response.data.result;
	}

	public async getFileContent(path: string, name: string): Promise<string> {
		const fullPath = this.getDownloadPath(path, name);
		console.log('file content: '+fullPath);
		const response = await axios.get(fullPath);

		return response.data;
	}

	
	public getDownloadPath(path: string, name: string): string {
		path = encodeURI(path);
		name = encodeURIComponent(name);
		if (OCA.Sharing?.PublicApp) {
			return $('#downloadURL').val() as string;
		}

		return generateRemoteUrl(`files${path}/${name}`);
	}

	public async uploadFile(path: string, name: string, data: any, etag?: string, contentType = 'text/xml') {
		const base = this.getUploadBase();
		const fullPath = OCA.Sharing?.PublicApp ? base : base + OC.joinPaths('/', path, name);

		const headers = {
			'Content-Type': contentType,
			'X-Method-Override': 'PUT',
		};

		if (etag) {
			headers['If-Match'] = `"${etag}"`;
		}

		if ($('#sharingToken').val()) {
			headers['Authorization'] = 'Basic ' + btoa($('#sharingToken').val() + ':');
		}

		let response;

		try {
			response = await axios.put(fullPath, data, {
				headers,
			});
		} catch (error) {
			if (!error.response) {
				throw error;
			}

			response = error.response;
		}

		return {
			data: response.data,
			statuscode: response.status,
			header: {
				etag: this.parseEtag(response.headers.etag),
			},
		};
	}

	public getUploadBase() {
		if (OCA.Sharing?.PublicApp) {
			return this.generatePublicUrl('webdav');
		}

		return generateRemoteUrl('webdav');
	}

	public generatePublicUrl(service: string) {
		return window.location.protocol + '//' + window.location.host + getRootUrl() + '/public.php/' + service;
	}

	private parseEtag(etag: string): string {
		if (etag && etag.charAt(0) === '"') {
			return etag.split('"')[1];
		}
		return etag;
	}

	// public async createFile(path: string, ext:string){

	// }

	public async getFileInfo(fileId: string): Promise<NextcloudFile>{

		var url = generateUrl('/apps/files_bpm/page/getFileInfo?fileId='+fileId);
		//var url = generateUrl('/apps/files_bpm/page/testDummy');
		const response = await axios.get(url);
		return response.data;
	}
	
}

const api = new Api();

export default api;