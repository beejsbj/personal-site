<?php
////////////utilities////////////// 
// show error verbosely.
function showErrors()
{
	error_reporting(E_ALL);
	ini_set('display_errors', '1');
}
showErrors();



// to print formatted arrays that are legible.
function format($variable)
{
	echo "<pre>";

	echo "<code class='block'>";

	print_r($variable);

	echo "</code>";
	echo "</pre>";
}

function getDirname()
{
	return dirname($_SERVER['SCRIPT_NAME']);
}


//show query string
function queryString()
{
	return $_SERVER['QUERY_STRING'];
}
// format($_SERVER);
////////////routing////////////// 

//get page name
function currentPage()
{
	if (isset($_GET['page'])) {
		return $_GET['page'];
	} else {
		return 'home';
	}
}


//get page data
function getPageData($page)
{

	if (!file_exists("data/pages/$page.json")) {
		$json = file_get_contents("data/pages/pageNotFound.json");
	} else {
		$json = file_get_contents("data/pages/$page.json");
	}
	$data = json_decode($json, true);
	return $data;
}




function renderPage($data, $template = '')
{
	$pageData = $data;
	$page = currentPage();
	if ($template) {
		include("templates/pages/$template/$template.php");
	} else {
		include("templates/pages/standard.php");
	}
}

function getProjects()
{
	$json = file_get_contents("data/projects-list.json");
	$data = json_decode($json, true);
	return $data;
}

function getProject($id)
{
	$projects = getProjects();
	foreach ($projects as $project) {
		if ($project['id'] == $id) {
			return $project;
		}
	}
}

function getExercise($id)
{
	$json = file_get_contents("data/exercises-list.json");
	$exercises = json_decode($json, true);
	$exercise = $exercises[$id - 1] ?? $exercises[57];
	return $exercise;
}



function activePage($current)
{

	if (currentPage() == $current) {
		return "active";
	}
}
function activeTheme($current)
{

	if (currentPage() == $current) {
		return "active";
	}
}


function currentTheme()
{
	$theme = "none";



	if (isset($_SESSION['theme'])) {
		$theme = $_SESSION['theme'];
	}

	if (isset($_GET['theme'])) {
		$theme = $_GET['theme'];
	}

	$_SESSION['theme'] = $theme;
	return $theme;
}

function projectFilter($projects, $tag)
{
	$filtered = [];

	foreach ($projects as $project) {
		$tags = $project['tags'] ?? [];

		if (in_array($tag, $tags)) {
			array_push($filtered, $project);
		}
	}
	return $filtered;
}


function getKebabCase($string)
{
	$str = str_replace(" ", "-", strtolower($string));
	return $str; // php-replace-space-with-dash
}



function getCamelCase($string)
{
	$splitString = explode(" ", ucwords($string));
	$finalString = implode("", $splitString);
	$finalString[0] = strtolower($finalString[0]);
	return $finalString;
}

function getTitleCase($title)
{
	// Our array of 'small words' which shouldn't be capitalised if
	// they aren't the first word. Add your own words to taste.
	$smallwordsarray = [
		'of',
		'a',
		'the',
		'and',
		'an',
		'or',
		'nor',
		'but',
		'is',
		'if',
		'then',
		'else',
		'when',
		'at',
		'from',
		'by',
		'on',
		'off',
		'for',
		'in',
		'out',
		'over',
		'to',
		'into',
		'with'
	];

	// Split the string into separate words
	$words = explode('-', strtolower($title));

	foreach ($words as $key => $word) {

		// If this word is the first, or it's not one of our small words, 
		if ($key == 0 or !in_array($word, $smallwordsarray)) {
			$words[$key] = ucwords($word); //capitalise it with ucwords().
		}
	}

	// Join the words back into a string
	$newtitle = implode(' ', $words);

	return $newtitle;
}


function exExists($slug)
{
	return	file_exists("projects/e4p/exercises/$slug.php");
}



// get substack articles

function get_substack_articles($substack_url, $limit = 6, $tag = null)
{
	// Construct the RSS feed URL (Substack provides RSS feeds at /feed)
	$rss_url = rtrim($substack_url, '/') . '/feed';

	// Fetch the RSS feed
	$rss_content = file_get_contents($rss_url);
	if (!$rss_content) {
		return [];
	}

	// Parse the XML
	$xml = simplexml_load_string($rss_content);
	if (!$xml) {
		return [];
	}

	$articles = [];
	$count = 0;

	foreach ($xml->channel->item as $item) {
		if ($count >= $limit) break;

		// Get categories/tags for the item
		$item_tags = [];
		if ($item->category) {
			foreach ($item->category as $category) {
				$item_tags[] = strtolower((string)$category);
			}
		}

		// Skip if tag is specified and article doesn't have that tag
		if ($tag && !in_array(strtolower($tag), $item_tags)) {
			continue;
		}

		// Extract the first image from the content if available
		$content = (string)$item->children('content', true);
		preg_match('/<img.+src=[\'"](?P<src>.+?)[\'"].*>/i', $content, $image);

		$articles[] = [
			'title' => htmlspecialchars((string)$item->title),
			'link' => htmlspecialchars((string)$item->link),
			'date' => htmlspecialchars(date('M j, Y', strtotime((string)$item->pubDate))),
			'image' => isset($image['src']) ? htmlspecialchars($image['src']) : '',
			'description' => htmlspecialchars(html_entity_decode(substr(strip_tags((string)$item->description), 0, 150) . '...')),
			'tags' => array_map('htmlspecialchars', $item_tags)
		];

		$count++;
	}

	return $articles;
}
