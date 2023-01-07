<?php


$id = $siteSlug[1] ?? $section['id'] ?? rand(1, 4);

include("templates/modules/layout$id/layout$id.php");