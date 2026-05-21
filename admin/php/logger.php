<?php

namespace SmartCloud\WPSuite\Flow;

/**
 * Logger utility for Flow
 * Provides centralized, configurable logging that respects WP admin settings
 */
class Logger
{
    /**
     * Log levels
     */
    public const DEBUG = 'debug';
    public const INFO = 'info';
    public const WARNING = 'warning';
    public const ERROR = 'error';

    /**
     * Cached Admin instance (lazy initialized)
     * @var \SmartCloud\WPSuite\Flow\Admin|null
     */
    private static $admin = null;

    /**
     * Get or create Admin instance (singleton pattern)
     * @return \SmartCloud\WPSuite\Flow\Admin|null
     */
    private static function getAdmin()
    {
        if (self::$admin === null && class_exists('\SmartCloud\WPSuite\Flow\Admin')) {
            self::$admin = new \SmartCloud\WPSuite\Flow\Admin();
        }
        return self::$admin;
    }

    /**
     * Log a message if debug logging is enabled
     *
     * @param string $message The message to log
     * @param string $level Log level (debug, info, warning, error)
     * @param array $context Additional context data
     * @return void
     */
    public static function log(string $message, string $level = self::INFO, array $context = []): void
    {
        // Check if debug logging is enabled in plugin settings (stored as JSON under SMARTCLOUD_AI_KIT_SLUG)
        // Try to get settings from the Admin class if available
        $admin = self::getAdmin();
        if ($admin && method_exists($admin, 'getSettings')) {
            $settings = $admin->getSettings();
            // getSettings() returns an FlowSettings object
            if (!$settings->debugLoggingEnabled) {
                return;
            }
        } else {
            // No admin available, skip logging
            return;
        }

        // Also respect WP_DEBUG as a fallback
        if (!defined('WP_DEBUG') || !WP_DEBUG) {
            return;
        }

        // Format message
        $formatted_message = sprintf(
            '[Flow][%s] %s',
            strtoupper($level),
            $message
        );

        // Add context if provided
        if (!empty($context)) {
            $formatted_message .= ' | Context: ' . wp_json_encode($context);
        }

        // Use WordPress debug log if available
        if (defined('WP_DEBUG_LOG') && WP_DEBUG_LOG) {
            // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log -- Conditional logging for debugging
            error_log($formatted_message);
        }
    }

    /**
     * Log a debug message
     *
     * @param string $message
     * @param array $context
     * @return void
     */
    public static function debug(string $message, array $context = []): void
    {
        self::log($message, self::DEBUG, $context);
    }

    /**
     * Log an info message
     *
     * @param string $message
     * @param array $context
     * @return void
     */
    public static function info(string $message, array $context = []): void
    {
        self::log($message, self::INFO, $context);
    }

    /**
     * Log a warning message
     *
     * @param string $message
     * @param array $context
     * @return void
     */
    public static function warning(string $message, array $context = []): void
    {
        self::log($message, self::WARNING, $context);
    }

    /**
     * Log an error message
     *
     * @param string $message
     * @param array $context
     * @return void
     */
    public static function error(string $message, array $context = []): void
    {
        self::log($message, self::ERROR, $context);
    }
}
