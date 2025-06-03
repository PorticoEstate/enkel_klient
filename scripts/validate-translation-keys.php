<?php
// scripts/validate-translation-keys.php
// Compares extracted translation keys with translation files and reports missing/unused keys

$extracted = json_decode(file_get_contents(__DIR__ . '/translation-keys.json'), true);
$translationDir = __DIR__ . '/../src/translations';

// Load all translation files
$translations = [];
foreach (glob($translationDir . '/*.php') as $file)
{
	$lang = basename($file, '.php');
	$translations[$lang] = include $file;
}

// Dynamically detect keys that have individual translations for each section
$sectionKeyCounts = [];
foreach ($extracted as $item) {
    $key = $item['key'];
    $section = $item['section'] ?: 'common';
    if (!isset($sectionKeyCounts[$key])) $sectionKeyCounts[$key] = [];
    $sectionKeyCounts[$key][$section] = true;
}
$multiSectionKeys = array_keys(array_filter($sectionKeyCounts, function($sections) {
    return count($sections) > 1;
}));

$missing = [];
$missingSet = [];
foreach ($extracted as $item)
{
    $key = $item['key'];
    $section = $item['section'] ?: 'common';
    foreach ($translations as $lang => $data)
    {
        $id = $lang . '|' . $section . '|' . $key;
        // Do not mark multi-section keys as missing if they exist in the translation file
        if (!isset($data[$section][$key]) && !isset($missingSet[$id]) && !in_array($key, $multiSectionKeys, true))
        {
            $missing[] = [
                'lang' => $lang,
                'section' => $section,
                'key' => $key
            ];
            $missingSet[$id] = true;
        }
    }
}

// Optionally, find unused keys
$usedKeys = array_map(function ($i)
{
    return $i['key'] . '|' . ($i['section'] ?: 'common');
}, $extracted);
$unused = [];
$unusedSet = [];
foreach ($translations as $lang => $data)
{
    foreach ($data as $section => $arr)
    {
        foreach ($arr as $key => $val)
        {
            $id = $lang . '|' . $section . '|' . $key;
            $usedId = $key . '|' . $section;
            // Do not mark multi-section keys as unused
            if (!in_array($key, $multiSectionKeys, true) && !in_array($usedId, $usedKeys) && !isset($unusedSet[$id]))
            {
                $unused[] = [
                    'lang' => $lang,
                    'section' => $section,
                    'key' => $key
                ];
                $unusedSet[$id] = true;
            }
        }
    }
}

file_put_contents(__DIR__ . '/translation-missing.json', json_encode($missing, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
file_put_contents(__DIR__ . '/translation-unused.json', json_encode($unused, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
echo "Validation complete. See translation-missing.json and translation-unused.json.\n";
