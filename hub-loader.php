<?php

namespace SmartCloud\WPSuite\Hub;

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly.
}

use SmartCloud\WPSuite\Flow\Logger;

const SMARTCLOUD_WPSUITE_FLOW_HUB_VERSION = '2.5.12';

final class FlowHubLoader
{
    private static ?FlowHubLoader $instance = null;

    private string $plugin;

    private string $text_domain;

    /** Hub admin instance */
    private HubAdmin $admin;

    private function __construct($plugin, $text_domain)
    {
        $this->plugin = $plugin;
        $this->text_domain = $text_domain;
        $this->includes();
    }

    /**
     * Access the singleton instance.
     */
    public static function instance($plugin, $text_domain): FlowHubLoader
    {
        if (self::$instance === null) {
            Logger::info('Initializing Flow Hub Loader singleton', [
                'plugin' => $plugin,
                'version' => SMARTCLOUD_WPSUITE_FLOW_HUB_VERSION
            ]);
        }

        return self::$instance ?? (self::$instance = new self($plugin, $text_domain));
    }

    /**
     * Hub init callback
     */
    public function init(): void
    {
        if (!isset($this->admin)) {
            Logger::debug('Hub init skipped - admin not initialized', [
                'plugin' => $this->plugin
            ]);
            return;
        }

        Logger::info('Hub initializing', ['plugin' => $this->plugin]);

        // Hooks.
        add_action('admin_menu', array($this, 'createAdminMenu'), 10);

        $this->admin->init();
    }

    public function createAdminMenu(): void
    {
        if (!isset($this->admin)) {
            Logger::debug('Hub menu creation skipped - admin not initialized', [
                'plugin' => $this->plugin
            ]);
            return;
        }

        Logger::debug('Creating Hub admin menu', ['plugin' => $this->plugin]);
        $icon_url = $this->admin->getIconUrl();
        add_menu_page(
            __('SmartCloud', 'smartcloud-flow'),
            __('SmartCloud', 'smartcloud-flow'),
            'manage_options',
            SMARTCLOUD_WPSUITE_CANONICAL_SLUG,
            null,
            $icon_url,
            58,
        );

        $connect_suffix = add_submenu_page(
            SMARTCLOUD_WPSUITE_CANONICAL_SLUG,
            __('Connect your Site to WP Suite', 'smartcloud-flow'),
            __('Connect your Site', 'smartcloud-flow'),
            'manage_options',
            SMARTCLOUD_WPSUITE_CANONICAL_SLUG,
            array($this->admin, 'renderAdminPage'),
        );

        $settings_suffix = add_submenu_page(
            SMARTCLOUD_WPSUITE_CANONICAL_SLUG,
            __('WPSuite General Settings', 'smartcloud-flow'),
            __('Global Settings', 'smartcloud-flow'),
            'manage_options',
            SMARTCLOUD_WPSUITE_CANONICAL_SLUG . '-settings',
            array($this->admin, 'renderAdminPage'),
        );

        add_submenu_page(
            null,
            __('WP Suite', 'smartcloud-flow'),
            __('WP Suite', 'smartcloud-flow'),
            'manage_options',
            SMARTCLOUD_WPSUITE_LEGACY_SLUG,
            array($this->admin, 'renderLegacyAdminPage'),
        );

        $this->admin->enqueueAdminScripts($connect_suffix, $settings_suffix);
    }

    /**
     * Check configuration and license.
     */
    public function check(): void
    {
        if (!isset($this->admin)) {
            return;
        }
        $this->admin->check();
    }

    private function includes()
    {
        Logger::debug('Hub includes() started', [
            'plugin' => $this->plugin,
            'version' => SMARTCLOUD_WPSUITE_FLOW_HUB_VERSION
        ]);

        if (!function_exists('is_plugin_active')) {
            require_once ABSPATH . 'wp-admin/includes/plugin.php';
        }

        $runtime_already_loaded = !empty($GLOBALS['smartcloud_wpsuite_menu_parent']);
        if ($runtime_already_loaded) {
            Logger::debug('Hub runtime already loaded; ownership migration will still run', [
                'plugin' => $this->plugin,
                'existing_parent' => $GLOBALS['smartcloud_wpsuite_menu_parent']
            ]);
        }

        // If Hub is not present, try to create a single common top-level menu
        // Mutex: first writer wins on the option
        if (!defined('SMARTCLOUD_WPSUITE_CANONICAL_SLUG')) {
            define('SMARTCLOUD_WPSUITE_CANONICAL_SLUG', 'smartcloud-wpsuite');
        }
        if (!defined('SMARTCLOUD_WPSUITE_LEGACY_SLUG')) {
            define('SMARTCLOUD_WPSUITE_LEGACY_SLUG', 'hub-for-wpsuiteio');
        }
        if (!defined('SMARTCLOUD_WPSUITE_SLUG')) {
            define('SMARTCLOUD_WPSUITE_SLUG', SMARTCLOUD_WPSUITE_CANONICAL_SLUG);
        }
        if (!defined('SMARTCLOUD_WPSUITE_RUNTIME_DIRECTORY')) {
            define('SMARTCLOUD_WPSUITE_RUNTIME_DIRECTORY', 'smartcloud-wpsuite');
        }
        $fallback_parent = SMARTCLOUD_WPSUITE_CANONICAL_SLUG;
        $owner_option = SMARTCLOUD_WPSUITE_CANONICAL_SLUG . '/top-menu-owner';
        $legacy_owner_option = SMARTCLOUD_WPSUITE_LEGACY_SLUG . '/top-menu-owner';
        $site_id = get_current_blog_id();

        $get_blog_option = static function (string $name, $default = '') use ($site_id) {
            if (is_multisite()) {
                return get_blog_option($site_id, $name, $default);
            }
            return get_option($name, $default);
        };
        $update_blog_option = static function (string $name, $value, bool $autoload = false) use ($site_id) {
            if (is_multisite()) {
                return update_blog_option($site_id, $name, $value);
            }
            return update_option($name, $value, $autoload);
        };

        $owner = $get_blog_option($owner_option, '');
        $owner_version = $get_blog_option($owner_option . '/version', '1.0.0');
        if (empty($owner)) {
            $legacy_owner = $get_blog_option($legacy_owner_option, '');
            if (!empty($legacy_owner)) {
                $owner = $legacy_owner;
                $owner_version = $get_blog_option($legacy_owner_option . '/version', '1.0.0');
                $update_blog_option($owner_option, $owner, false);
                $update_blog_option($owner_option . '/version', $owner_version, false);
            }
        }
        $set_owner = static function (string $plugin, string $version) use ($owner_option, $legacy_owner_option, $update_blog_option): void {
            $update_blog_option($owner_option, $plugin, false);
            $update_blog_option($owner_option . '/version', $version, false);
            $update_blog_option($legacy_owner_option, $plugin, false);
            $update_blog_option($legacy_owner_option . '/version', $version, false);
        };
        $owner_missing = empty($owner);
        $owner_is_me = ($owner === $this->plugin);

        Logger::debug('Hub ownership check', [
            'current_plugin' => $this->plugin,
            'current_owner' => $owner ?: 'none',
            'owner_version' => $owner_version,
            'this_version' => SMARTCLOUD_WPSUITE_FLOW_HUB_VERSION,
            'owner_missing' => $owner_missing,
            'owner_is_me' => $owner_is_me
        ]);

        $plugin_dir = plugin_dir_path(__DIR__);
        $owner_plugin = ltrim(str_replace('\\/', '/', wp_unslash((string) $owner)), '/\\');
        $owner_plugin_path = wp_normalize_path(untrailingslashit($plugin_dir) . '/' . $owner_plugin);
        $active_valid_plugins = wp_get_active_and_valid_plugins();
        if (is_multisite()) {
            $active_valid_plugins = array_merge($active_valid_plugins, wp_get_active_network_plugins());
        }
        $active_valid_plugins = array_map('wp_normalize_path', $active_valid_plugins);

        $owner_is_active = !empty($owner_plugin) && is_plugin_active($owner_plugin);
        $owner_exists = !empty($owner_plugin) && file_exists($owner_plugin_path);
        $owner_is_valid = in_array($owner_plugin_path, $active_valid_plugins, true);
        $owner_inactive = !$owner_is_active || !$owner_is_valid || !$owner_exists;

        if ($owner && $owner_inactive) {
            Logger::warning('Current hub owner is inactive', [
                'owner' => $owner,
                'is_active' => $owner_is_active,
                'exists' => $owner_exists,
                'is_valid' => $owner_is_valid
            ]);
        }

        $owner_version_is_smaller = version_compare($owner_version, SMARTCLOUD_WPSUITE_FLOW_HUB_VERSION) === -1;
        $owner_version_equals = version_compare($owner_version, SMARTCLOUD_WPSUITE_FLOW_HUB_VERSION) === 0;

        if ($runtime_already_loaded) {
            if ($owner_missing || $owner_inactive || $owner_version_is_smaller) {
                $set_owner($this->plugin, SMARTCLOUD_WPSUITE_FLOW_HUB_VERSION);
            }
            return false;
        }

        // If there is no owner yet, try to claim it
        if ($owner_missing || $owner_is_me || $owner_inactive || $owner_version_is_smaller) {
            Logger::debug('Hub ownership claim attempt', [
                'plugin' => $this->plugin,
                'reason' => $owner_missing ? 'owner_missing' :
                    ($owner_is_me ? 'owner_is_me' :
                        ($owner_inactive ? 'owner_inactive' :
                            ($owner_version_is_smaller ? 'version_upgrade' : 'unknown'))),
                'current_owner' => $owner ?: 'none',
                'current_version' => $owner_version,
                'new_version' => SMARTCLOUD_WPSUITE_FLOW_HUB_VERSION
            ]);

            $result = false;
            // add_option atomic: only one can win in case of multiple concurrent requests
            if (empty($GLOBALS['smartcloud_wpsuite_fallback_parent_added'])) {
                $GLOBALS['smartcloud_wpsuite_fallback_parent_added'] = true;
                $result = true;

                Logger::info('Hub ownership claimed successfully', [
                    'plugin' => $this->plugin,
                    'version' => SMARTCLOUD_WPSUITE_FLOW_HUB_VERSION,
                    'previous_owner' => $owner ?: 'none'
                ]);

                define('SMARTCLOUD_WPSUITE_VERSION', SMARTCLOUD_WPSUITE_FLOW_HUB_VERSION);
                define('SMARTCLOUD_WPSUITE_PATH', plugin_dir_path(__FILE__) . SMARTCLOUD_WPSUITE_RUNTIME_DIRECTORY . '/');
                define('SMARTCLOUD_WPSUITE_URL', plugin_dir_url(__FILE__) . SMARTCLOUD_WPSUITE_RUNTIME_DIRECTORY . '/');
                define('SMARTCLOUD_WPSUITE_READY_HOOK', SMARTCLOUD_WPSUITE_CANONICAL_SLUG . '/ready');

                if (file_exists(SMARTCLOUD_WPSUITE_PATH . 'index.php')) {
                    require_once SMARTCLOUD_WPSUITE_PATH . 'index.php';
                }
                if (class_exists('\SmartCloud\WPSuite\Hub\HubAdmin')) {
                    $this->admin = new HubAdmin();
                }
                if (!$owner_is_me || !$owner_version_equals) {
                    $set_owner($this->plugin, SMARTCLOUD_WPSUITE_FLOW_HUB_VERSION);

                    Logger::info('Hub ownership registered in database', [
                        'plugin' => $this->plugin,
                        'version' => SMARTCLOUD_WPSUITE_FLOW_HUB_VERSION
                    ]);
                }
            } else {
                Logger::debug('Hub ownership race lost - another plugin already claimed', [
                    'plugin' => $this->plugin,
                    'winner' => $get_blog_option($owner_option, 'unknown')
                ]);
            }
            if (!$owner_is_me && $owner_version_is_smaller) {
                $set_owner($this->plugin, SMARTCLOUD_WPSUITE_FLOW_HUB_VERSION);

                Logger::info('Hub ownership updated due to version upgrade', [
                    'plugin' => $this->plugin,
                    'from_version' => $owner_version,
                    'to_version' => SMARTCLOUD_WPSUITE_FLOW_HUB_VERSION,
                    'previous_owner' => $owner
                ]);
            }
            return $result;
        }

        Logger::debug('Hub ownership check - no claim needed', [
            'plugin' => $this->plugin,
            'owner' => $owner,
            'owner_version' => $owner_version
        ]);

        return false;
    }

}
