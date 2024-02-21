<?php

return [
	'resources' => [],
	'routes' => [
		['name' => 'preview#check', 'url' => '/preview/check', 'verb' => 'POST'],
// this tells Nextcloud to link GET requests to /index.php/apps/catgifs/ with the "mainPage" method of the PageController class
		['name' => 'page#index', 'url' => '/', 'verb' => 'GET'],
		["name" => "page#getFileInfo", "url" => "/page/getFileInfo", "verb" => "GET"],

	]
];
