<?php
/** @var $l \OCP\IL10N */
/** @var $_ array */

script('files_bpm', 'admin');
?>
<link rel="stylesheet" href="/custom_apps/files_bpm/suneditor/dist/css/suneditor.min.css">

<div id="bpm-settings" class="section">
    <h2>BPM Editor</h2>

    <form id="bpm-preview">
        <input type="url" name="preview.server" value="<?php p($_['preview.server']); ?>" placeholder="<?php p($l->t('URL to preview server')); ?>" pattern="https?://.*" required />
        <input type="submit" value="<?php p($l->t('Save')); ?>" />

        <div class="bpm-result"></div>
    </form>


</div>
