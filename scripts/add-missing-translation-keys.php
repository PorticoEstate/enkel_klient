<?php
// Ensure script is run from command line only
if (php_sapi_name() !== 'cli')
{
    http_response_code(403);
    die('This script can only be run from the command line.');
}
// scripts/add-missing-translation-keys.php
// Adds missing translation keys to translation files based on translation-missing.json
// Uses the key name as the value, so you can easily find and translate them later

$missingFile = __DIR__ . '/translation-missing.json';
$translationDir = __DIR__ . '/../src/translations';

if (!file_exists($missingFile))
{
    echo "translation-missing.json not found. Run validate-translation-keys.php first.\n";
    exit(1);
}

$missing = json_decode(file_get_contents($missingFile), true);
if (!is_array($missing))
{
    echo "translation-missing.json is not valid JSON.\n";
    exit(1);
}

// Group missing keys by lang and section for efficient processing
$toAdd = [];
foreach ($missing as $entry)
{
    $lang = $entry['lang'];
    $section = $entry['section'];
    $key = $entry['key'];
    $toAdd[$lang][$section][] = $key;
}

// Dynamically detect keys that have individual translations for each section
$extracted = json_decode(file_get_contents(__DIR__ . '/translation-keys.json'), true);
$sectionKeyCounts = [];
foreach ($extracted as $item)
{
    $key = $item['key'];
    $section = $item['section'] ?: 'common';
    if (!isset($sectionKeyCounts[$key])) $sectionKeyCounts[$key] = [];
    $sectionKeyCounts[$key][$section] = true;
}
$multiSectionKeys = array_keys(array_filter($sectionKeyCounts, function ($sections)
{
    return count($sections) > 1;
}));

foreach ($toAdd as $lang => $sections)
{
    $file = "$translationDir/$lang.php";
    if (!file_exists($file))
    {
        echo "Translation file not found: $file\n";
        continue;
    }
    $translations = include $file;
    $changed = false;
    foreach ($sections as $section => $keys)
    {
        if (!isset($translations[$section]))
        {
            $translations[$section] = [];
        }
        foreach ($keys as $key)
        {
            // Never auto-add multi-section keys (section-specific keys)
            if (in_array($key, $multiSectionKeys, true)) continue;
            if (!isset($translations[$section][$key]))
            {
                // Use the key name as the value for easy recognition
                $translations[$section][$key] = strtoupper($key) . ' (TRANSLATE)';
                $changed = true;
                echo "Added $key to [$section] in $lang.php\n";
            }
        }
    }
    if ($changed)
    {
        // Write back to file (preserve PHP array format)
        $export = "<?php\nreturn " . var_export($translations, true) . ";\n";
        file_put_contents($file, $export);
        echo "Updated $file\n";
    }
}
echo "Add-missing complete.\n";
