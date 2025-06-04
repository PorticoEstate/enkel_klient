<?php
// Ensure script is run from command line only
if (php_sapi_name() !== 'cli')
{
    http_response_code(403);
    die('This script can only be run from the command line.');
}
// scripts/extract-translation-keys.php
// Scans PHP and Twig files for translation key usage and outputs a JSON file with all found keys/sections

$srcDirs = [__DIR__ . '/../src', __DIR__ . '/../src/templates'];

// Patterns for different translation methods
$patterns = [
    // Twig template pattern: __('key', 'section') or __('key')
    'twig' => '/__\([\'\"]([^\'\"]+)[\'\"](,\s*[\'\"]([^\'\"]+)[\'\"])?/',
    // PHP controller pattern: $translator->translate('key', 'section') or $var->translate('key', 'section')
    'php' => '/\$\w+->translate\([\'\"]([^\'\"]+)[\'\"](,\s*[\'\"]([^\'\"]+)[\'\"])?/'
];

// Map template filenames to their corresponding sections
$templateToSection = [
    'helpdesk.twig' => 'helpdesk',
    'nokkelbestilling.twig' => 'nokkelbestilling',
    'invoicerequest.twig' => 'invoicerequest',
    'inspection_1.twig' => 'inspection_1'
];

// Map controller filenames to their corresponding sections
$controllerToSection = [
    'HelpdeskController.php' => 'helpdesk',
    'NokkelbestillingController.php' => 'nokkelbestilling',
    'InvoicerequestController.php' => 'invoicerequest',
    'Inspection1Controller.php' => 'inspection_1'
];

$foundWithMeta = [];
$keyFileMapping = []; // Track which files each key appears in

foreach ($srcDirs as $dir)
{
    $rii = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir));
    foreach ($rii as $file)
    {
        if ($file->isDir()) continue;
        if (!preg_match('/\.(php|twig)$/', $file->getFilename())) continue;

        $content = file_get_contents($file->getPathname());
        $lines = explode("\n", $content);
        $filename = $file->getFilename();

        foreach ($lines as $lineNum => $line)
        {
            // Determine which patterns to use based on file type
            $filePatterns = [];
            if (preg_match('/\.twig$/', $filename))
            {
                $filePatterns['twig'] = $patterns['twig'];
            }
            elseif (preg_match('/\.php$/', $filename))
            {
                $filePatterns['twig'] = $patterns['twig']; // PHP files can also use __() function
                $filePatterns['php'] = $patterns['php'];   // PHP files can use $translator->translate()
            }

            foreach ($filePatterns as $patternType => $pattern)
            {
                if (preg_match_all($pattern, $line, $matches, PREG_SET_ORDER))
                {
                    foreach ($matches as $match)
                    {
                        $key = $match[1];
                        $explicitSection = isset($match[3]) ? $match[3] : null;

                        // Track which files this key appears in
                        if (!isset($keyFileMapping[$key]))
                        {
                            $keyFileMapping[$key] = [];
                        }
                        $keyFileMapping[$key][$filename] = true;

                        // Determine section: explicit section takes precedence, then template/controller mapping, then common
                        $section = $explicitSection;
                        if (!$section && isset($templateToSection[$filename]))
                        {
                            $section = $templateToSection[$filename];
                        }
                        if (!$section && isset($controllerToSection[$filename]))
                        {
                            $section = $controllerToSection[$filename];
                        }
                        if (!$section)
                        {
                            $section = 'common';
                        }

                        $id = $key . '|' . $section . '|' . $filename; // Include filename to ensure uniqueness
                        $foundWithMeta[$id] = [
                            'key' => $key,
                            'section' => $section,
                            'file' => $file->getPathname(),
                            'line' => $lineNum + 1
                        ];
                    }
                }
            }
        }
    }
}

// Analyze multi-section keys: keys that appear in multiple template files with different sections
$multiSectionKeys = [];
foreach ($keyFileMapping as $key => $files)
{
    $sections = [];
    foreach (array_keys($files) as $filename)
    {
        if (isset($templateToSection[$filename]))
        {
            $sections[$templateToSection[$filename]] = true;
        }
        if (isset($controllerToSection[$filename]))
        {
            $sections[$controllerToSection[$filename]] = true;
        }
    }
    if (count($sections) > 1)
    {
        $multiSectionKeys[$key] = array_keys($sections);
        echo "Multi-section key detected: '$key' appears in sections: " . implode(', ', array_keys($sections)) . "\n";
    }
}

// Create final output, ensuring multi-section keys are represented properly
$final = [];
$processedKeys = [];

foreach ($foundWithMeta as $item)
{
    $key = $item['key'];

    // For multi-section keys, create entries for each section they should appear in
    if (isset($multiSectionKeys[$key]))
    {
        foreach ($multiSectionKeys[$key] as $section)
        {
            $uniqueId = $key . '|' . $section;
            if (!isset($processedKeys[$uniqueId]))
            {
                $final[] = [
                    'key' => $key,
                    'section' => $section,
                    'file' => $item['file'], // Use the first found file as reference
                    'line' => $item['line']
                ];
                $processedKeys[$uniqueId] = true;
            }
        }
    }
    else
    {
        // For single-section keys, just add them as-is
        $uniqueId = $key . '|' . $item['section'];
        if (!isset($processedKeys[$uniqueId]))
        {
            $final[] = $item;
            $processedKeys[$uniqueId] = true;
        }
    }
}

file_put_contents(__DIR__ . '/translation-keys.json', json_encode($final, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
echo "Extracted translation keys to scripts/translation-keys.json\n";
echo "Found " . count($multiSectionKeys) . " multi-section keys\n";
