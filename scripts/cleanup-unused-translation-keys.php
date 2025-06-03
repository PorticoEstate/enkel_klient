<?php
// scripts/cleanup-unused-translation-keys.php
// Removes unused translation keys from translation files based on translation-unused.json

$unusedFile = __DIR__ . '/translation-unused.json';
$translationDir = __DIR__ . '/../src/translations';

if (!file_exists($unusedFile)) {
    echo "translation-unused.json not found. Run validate-translation-keys.php first.\n";
    exit(1);
}

$unused = json_decode(file_get_contents($unusedFile), true);
if (!is_array($unused)) {
    echo "translation-unused.json is not valid JSON.\n";
    exit(1);
}

// Group unused keys by lang and section for efficient processing
$toRemove = [];
foreach ($unused as $entry) {
    $lang = $entry['lang'];
    $section = $entry['section'];
    $key = $entry['key'];
    $toRemove[$lang][$section][] = $key;
}

// Dynamically detect keys that have individual translations for each section
$extracted = json_decode(file_get_contents(__DIR__ . '/translation-keys.json'), true);
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

foreach ($toRemove as $lang => $sections) {
    $file = "$translationDir/$lang.php";
    if (!file_exists($file)) {
        echo "Translation file not found: $file\n";
        continue;
    }
    $translations = include $file;
    $changed = false;
    foreach ($sections as $section => $keys) {
        if (!isset($translations[$section])) continue;
        foreach ($keys as $key) {
            // Never remove multi-section keys
            if (in_array($key, $multiSectionKeys, true)) continue;
            if (isset($translations[$section][$key])) {
                unset($translations[$section][$key]);
                $changed = true;
                echo "Removed $key from [$section] in $lang.php\n";
            }
        }
        // Remove section if empty
        if (empty($translations[$section])) {
            unset($translations[$section]);
            echo "Removed empty section [$section] from $lang.php\n";
        }
    }
    if ($changed) {
        // Write back to file (preserve PHP array format)
        $export = "<?php\nreturn " . var_export($translations, true) . ";\n";
        file_put_contents($file, $export);
        echo "Updated $file\n";
    }
}
echo "Cleanup complete.\n";
