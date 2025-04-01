<?php
declare(strict_types=1);
use OCP\Util;

// SPDX-FileCopyrightText: Kirsten Hauck <kirstenhauck@proton.me>
// SPDX-License-Identifier: AGPL-3.0-or-later
  $appId = OCA\FilesBpm\AppInfo\Application::APP_ID;

  Util::addScript($appId, 'main');
?>
<link rel="stylesheet" href="/custom_apps/files_bpm/suneditor/dist/css/suneditor.min.css">

<div id="app-content">
<div id="canvas" class="bpmn-canvas">

</div>

</div>
