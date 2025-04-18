<?php
namespace App\Service;

class Translator
{
    private $translations = [];
    private $lang = 'en';

    public function __construct($lang = 'en')
    {
        $this->lang = in_array($lang, ['en', 'no']) ? $lang : 'en';
        $this->loadTranslations();
    }

    private function loadTranslations()
    {
        $file = __DIR__ . '/../translations/' . $this->lang . '.php';
        if (file_exists($file)) {
            $this->translations = include $file;
        }
    }

    public function translate($key)
    {
        return $this->translations[$key] ?? $key;
    }
}
