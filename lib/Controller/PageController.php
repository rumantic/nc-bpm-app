<?php
namespace OCA\FilesBpm\Controller;

use OCP\IRequest;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\AppFramework\Http\Template\PublicTemplateResponse;
use OCP\AppFramework\Http\DataResponse;
use OCP\AppFramework\Controller;
use OCP\Util;
use OCP\AppFramework\Services\IInitialState;
use OCP\IConfig;
use OCP\Files\IRootFolder;

use OCP\AppFramework\Http;


//Thanks to : https://github.com/githubkoma/multiboards/blob/main/js/filesintegration/src/index.js


class PageController extends Controller {
	private $userId;
	private IRootFolder $storage;

	
	public function __construct($AppName, IRequest $request, IRootFolder $storage, $UserId){
		parent::__construct($AppName, $request);
		$this->userId = $UserId;
		$this->storage = $storage;
	}


	/**
	 * CAUTION: the @Stuff turns off security checks; for this page no admin is
	 *          required and no CSRF check. If you don't know what CSRF is, read
	 *          it up in the docs or you might create a security hole. This is
	 *          basically the only required method to add this exemption, don't
	 *          add it to any other method if you don't exactly know what it does
	 *
	 * @NoAdminRequired
	 * @NoCSRFRequired
	 * @PublicPage
	 */	 
    public function index() {	
	
		if ($this->userId == "") {
	
			$template = new PublicTemplateResponse($this->appName, 'modeler', []);
			$template->setHeaderTitle('BPMN Files');
			$template->setHeaderDetails("Public");
			$template->setFooterVisible(false);
			
			$response = $template;
			//$response->setHeaders(['X-Frame-Options' => 'allow-from *']);		// Should be needed when this site is allowed to be embedded by 3rd party sites
			
		} else {
			$response = $this->indexLoggedIn();
		}
		
        return $response;
    }
	
	/**
	 * CAUTION: the @Stuff turns off security checks; for this page no admin is
	 *          required and no CSRF check. If you don't know what CSRF is, read
	 *          it up in the docs or you might create a security hole. This is
	 *          basically the only required method to add this exemption, don't
	 *          add it to any other method if you don't exactly know what it does
	 *
	 * @NoAdminRequired
	 * @NoCSRFRequired
	 */
	public function indexLoggedIn() {
		return new TemplateResponse($this->appName, 'modeler');  // templates/index.php
	}


	private function getFile($fileId){
		$files = $this->storage->getById($fileId);

        if (empty($files))
        {
            throw new NotFoundException();
        }

        $file = $files[0];

        if (!$file->isReadable())
        {
            throw new ForbiddenException();
        }

        return $file;
	}
	

	public function getFileInfo($fileId) {
		try 
        {
            $file = $this->getFile($fileId);
			//, $writeable, $relativePath
            if ($file instanceof Folder) {
                return new DataResponse(['message' => 'You can not open a folder'], Http::STATUS_BAD_REQUEST);
            }


            $baseFolder = $this->storage->getUserFolder($this->userId);
            $relativePath = dirname($baseFolder->getRelativePath($file->getPath()));

            return new DataResponse(
                [
                    'id' => $file->getId(),
                    'size' => $file->getSize(),
                    'writeable' => $file->isUpdateable(),
                    'mime' => $file->getMimeType(),
                    'path' => $relativePath,
                    'name' => $file->getName(),
                    'owner' => $file->getOwner()->getUID(),
                    'etag' => $file->getEtag(),
                    'mtime' => $file->getMTime(),
                    'created' => $file->getCreationTime() + $file->getUploadTime(),
                    'instanceId' => \OC_Util::getInstanceId()
                ],
                Http::STATUS_OK
            );
        }
        catch (\Exception $e) {
			$message ='An internal server error occurred.';
			return new DataResponse(['message' => $message], Http::STATUS_INTERNAL_SERVER_ERROR);
		}
    
    }

	public function getFileContent($fileId){
		try 
        {
            $file = $this->getFile($fileId);
			//, $writeable, $relativePath
            if ($file instanceof Folder) {
                return new DataResponse(['message' => 'You can not open a folder'], Http::STATUS_BAD_REQUEST);
            }

			return $file->getContent();

        }
        catch (\Exception $e) {
			$message ='An internal server error occurred.';
			return new DataResponse(['message' => $message], Http::STATUS_INTERNAL_SERVER_ERROR);
		}
	}



}
