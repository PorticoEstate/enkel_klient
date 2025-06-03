# Translation System Scripts

## extract-translation-keys.php
Scans all PHP and Twig files for usages of the translation function `__()` and outputs a list of all found keys/sections to `translation-keys.json`.

## validate-translation-keys.php
Compares the extracted keys with all translation files in `src/translations/` and outputs:
- `translation-missing.json`: All keys used in code/templates but missing in any language file.
- `translation-unused.json`: All keys present in translation files but not used in code/templates.

## Usage

```bash
php scripts/extract-translation-keys.php
php scripts/validate-translation-keys.php
php scripts/cleanup-unused-translation-keys.php
php scripts/add-missing-translation-keys.php
```

Add these scripts to your CI pipeline to ensure translation coverage and cleanliness.
