<?php


$id = $siteSlug[3] ?? $section['id'] ?? rand(1, 4);

include("templates/modules/layout$id/layout$id.php");