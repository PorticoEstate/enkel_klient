<?php
namespace App\Service;

class Translator
{
    private $translations = [];
    private $lang = 'no';

    public function __construct($lang = 'en')
    {
        $this->lang = in_array($lang, ['en', 'no']) ? $lang : 'en';
        $this->loadTranslations();
    }

    private function loadTranslations()
    {
        $file = SRC_ROOT . '/translations/' . $this->lang . '.php';
        if (file_exists($file)) {
            $this->translations = include $file;
        }
    }

    /**
     * Translate a key, searching in the given section first, then 'common'.
     * @param string $key
     * @param string|null $section
     * @return string
     */
    public function translate($key, $section = null)
    {
        if ($section && isset($this->translations[$section][$key])) {
            return $this->translations[$section][$key];
        }
        if (isset($this->translations['common'][$key])) {
            return $this->translations['common'][$key];
        }
        // Optionally search all sections if not found (fallback)
        foreach ($this->translations as $sect => $arr) {
            if ($sect !== 'common' && isset($arr[$key])) {
                return $arr[$key];
            }
        }
        return $key;
    }
}
