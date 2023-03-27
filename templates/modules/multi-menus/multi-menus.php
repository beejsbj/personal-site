<?php

$menus = $section['menus'] ?? ["theme", "site", "test"];
$menusID = $section['id'] ?? "";

echo "<menu-group id='$menusID' >";
foreach ($menus as $menu) {
	include 'templates/modules/menu-module/menu-module.php';
}
echo "</menu-group>";
