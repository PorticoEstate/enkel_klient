<?php

namespace App\Service;

use HTMLPurifier;
use HTMLPurifier_Config;
use DateTime;
use DateTimeZone;

/**
 * Class Sanitizer provides various methods to sanitize different types of inputs.
 */
class Sanitizer
{
	/** @var HTMLPurifier|null */
	private static ?HTMLPurifier $purifier = null;

	/**
	 * Sanitizes a string input by removing tags and special characters.
	 *
	 * @param string|null $input The string to sanitize.
	 * @return string The sanitized string.
	 */
	public static function sanitizeString(?string $input): string
	{
		if ($input === null)
		{
			return '';
		}
		return htmlspecialchars(strip_tags(trim($input)), ENT_QUOTES, 'UTF-8');
	}

	/**
	 * Returns a HTMLPurifier instance for sanitizing HTML content.
	 *
	 * @return HTMLPurifier The HTMLPurifier instance.
	 */
	private static function getPurifier(): HTMLPurifier
	{
		if (self::$purifier === null)
		{
			$config = HTMLPurifier_Config::createDefault();
			$config->set('HTML.Allowed', 'p,br,strong,em,ul,li,ol');
			$config->set('HTML.Doctype', 'HTML 4.01 Transitional');
			$config->set('Cache.SerializerPath', '/tmp');
			self::$purifier = new HTMLPurifier($config);
		}
		return self::$purifier;
	}


	/**
	 * Sanitizes an HTML string by removing unwanted tags and attributes.
	 *
	 * @param string|null $input The HTML string to sanitize.
	 * @return string The sanitized HTML string.
	 */
	public static function sanitizeHTML(?string $input): string
	{
		if ($input === null)
		{
			return '';
		}
		return self::getPurifier()->purify($input);
	}


	/**
	 * Sanitizes an email address by removing unwanted characters.
	 *
	 * @param string|null $input The email address to sanitize.
	 * @return string The sanitized email address.
	 */
	public static function sanitizeEmail(?string $input): string
	{
		if ($input === null)
		{
			return '';
		}
		$email = filter_var(trim($input), FILTER_SANITIZE_EMAIL);
		return filter_var($email, FILTER_VALIDATE_EMAIL) ? $email : '';
	}

	/**
	 * Sanitizes a phone number by allowing only digits and common phone number characters.
	 *
	 * @param string|null $input The phone number to sanitize.
	 * @return string The sanitized phone number.
	 */
	public static function sanitizePhone(?string $input): string
	{
		if ($input === null)
		{
			return '';
		}
		// Remove everything except digits and common phone number characters
		return preg_replace('/[^0-9+\-\s()]/', '', $input);
	}

	/**
	 * Sanitizes an integer input by removing unwanted characters.
	 *
	 * @param mixed $input The input to sanitize.
	 * @return int The sanitized integer.
	 */
	public static function sanitizeInt($input): int
	{
		return filter_var($input, FILTER_SANITIZE_NUMBER_INT);
	}

	/**
	 * Sanitizes a URL by removing unwanted characters.
	 *
	 * @param string|null $input The URL to sanitize.
	 * @return string The sanitized URL.
	 */
	public static function sanitizeUrl(?string $input): string
	{
		if ($input === null)
		{
			return '';
		}
		$url = filter_var(trim($input), FILTER_SANITIZE_URL);
		return filter_var($url, FILTER_VALIDATE_URL) ? $url : '';
	}

	/**
	 * Sanitizes a filename by removing unwanted characters.
	 *
	 * @param string|null $input The filename to sanitize.
	 * @return string The sanitized filename.
	 */
	public static function sanitizeFilename(?string $input): string
	{
		if ($input === null)
		{
			return '';
		}
		// Remove any character that isn't a letter, number, underscore, dash, or dot
		return preg_replace('/[^a-zA-Z0-9_\-\.]/', '', $input);
	}

	/**
	 * Sanitizes a date string by converting it to a Unix timestamp.
	 *
	 * @param string|null $input The date string to sanitize.
	 * @param string|null $timezone The timezone of the date string.
	 * @return int|null The Unix timestamp of the date string.
	 */
	public static function sanitizeDate(?string $input, ?string $timezone = 'UTC'): ?int
	{
		if ($input === null)
		{
			return null;
		}
		try
		{
			$date = new DateTime($input, new DateTimeZone($timezone));
			return $date->getTimestamp();
		}
		catch (\Exception $e)
		{
			return null;
		}
	}

	/**
	 * Sanitizes a color string by validating it as a hex color.
	 *
	 * @param string|null $input The color string to sanitize.
	 * @return string The sanitized color string, or an empty string if invalid.
	 */
	public static function sanitizeColor(?string $input): string
	{
		if ($input === null)
		{
			return '';
		}
		$input = strtolower(trim($input));
		return preg_match('/^#([a-f0-9]{3}){1,2}$/', $input) ? $input : '';
	}

	
	/**
	 * Sanitizes an IP address by validating it.
	 *
	 * @param string|null $input The IP address to sanitize.
	 * @return string The sanitized IP address, or an empty string if invalid.
	 */
	public static function sanitizeIp(?string $input): string
	{
		if ($input === null)
		{
			return '';
		}
		return filter_var($input, FILTER_VALIDATE_IP) ? $input : '';
	}

	
	/**
	 * Sanitizes a boolean value by interpreting various string representations.
	 *
	 * @param mixed $input The input to sanitize.
	 * @return bool The sanitized boolean value.
	 */
	public static function sanitizeBoolean($input): bool
	{
		if (is_string($input))
		{
			return !preg_match('/^(false|0|no|off|null)$/i', $input);
		}
		return (bool)$input;
	}

	/**
	 * Sanitizes an array of strings by removing unwanted characters.
	 *
	 * @param array|null $input The array of strings to sanitize.
	 * @param string $valueType The type of sanitization to perform (default is 'string').
	 * @return array The sanitized array of strings.
	 */
	public static function sanitizeArray(?array $input, string $valueType = 'string'): array
	{
		if ($input === null)
		{
			return [];
		}

		return array_map(function ($value) use ($valueType)
		{
			switch ($valueType)
			{
				case 'int':
					return self::sanitizeInt($value);
				case 'email':
					return self::sanitizeEmail($value);
				case 'html':
					return self::sanitizeHTML($value);
				case 'url':
					return self::sanitizeUrl($value);
				default:
					return self::sanitizeString($value);
			}
		}, $input);
	}
}
