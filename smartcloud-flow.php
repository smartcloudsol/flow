<?php
/**
 * Plugin Name:       SmartCloud Flow – Block‑based Forms & Workflow Automation
 * Plugin URI:        https://wpsuite.io/flow/
 * Description:       Mantine-based Gutenberg form blocks with AWS-native workflows, submissions, templates, and admin automation tools.
 * Requires at least: 6.2
 * Tested up to:      6.9
 * Requires PHP:      8.1
 * Version:           1.0.0
 * Author:            Smart Cloud Solutions Inc.
 * Author URI:        https://smart-cloud-solutions.com
 * License:           MIT
 * License URI:       https://mit-license.org/
 * Text Domain:       smartcloud-flow
 *
 * @package           smartcloud-flow
 */

namespace SmartCloud\WPSuite\Flow;

const VERSION = '1.0.0';

if (!defined('ABSPATH')) {
    exit;
}

if (version_compare(PHP_VERSION, '8.1', '<')) {
    deactivate_plugins(plugin_basename(__FILE__));
    wp_die(
        esc_html__('WP Suite Forms requires PHP 8.1 or higher.', 'smartcloud-flow'),
        esc_html__('Plugin dependency check', 'smartcloud-flow'),
        ['back_link' => true]
    );
}

final class Flow
{
    private static ?Flow $instance = null;
    private Admin $admin;

    /** @var string[] */
    private array $blocks = [
        'form',
        'operations',
        'group-field',
        'grid-field',
        'stack-field',
        'text-field',
        'textarea-field',
        'select-field',
        'checkbox-field',
        'date-field',
        'switch-field',
        'number-field',
        'radio-field',
        'password-field',
        'pin-field',
        'color-field',
        'file-field',
        'slider-field',
        'range-slider-field',
        'tags-field',
        'rating-field',
        'save-draft-button',
        'ai-suggestions',
        'submit-button',
        'fieldset',
        'collapse',
        'divider',
        'visually-hidden',
        'wizard',
        'wizard-step',
        'success-state',
        'submission-meta',
    ];

    public static function instance(): Flow
    {
        return self::$instance ?? (self::$instance = new self());
    }

    private function __construct()
    {
        $this->defineConstants();
        $this->includes();
    }

    public function init(): void
    {
        $this->registerBlocks();

        add_action('wp_enqueue_scripts', [$this, 'enqueueFrontendAssets'], 20);
        add_action('elementor/preview/after_enqueue_scripts', [$this, 'enqueueFrontendAssets'], 20);

        add_action('enqueue_block_editor_assets', [$this, 'enqueueEditorAssets'], 20);
        add_filter('block_categories_all', [$this, 'registerBlockCategory'], 20, 2);

        add_action('admin_menu', [$this, 'createAdminMenu'], 30);

        // Shortcode registration
        add_shortcode('smartcloud-flow-form', [$this, 'shortcodeFlowForm']);
        add_filter('no_texturize_shortcodes', function ($shortcodes) {
            $shortcodes[] = 'smartcloud-flow-form';
            return $shortcodes;
        });
    }

    /**
     * Shared shortcode parsing/normalization for Flow blocks.
     *
     * - Supports camelCase, kebab-case and snake_case attribute names.
     * - Merges defaults + (optional) surrounding block attrs + shortcode attrs.
     * - Decodes selected JSON-ish attributes when provided as strings.
     * - Supports "mini-YAML" shortcode body via configB64 + configFormat.
     *
     * @param array  $atts
     * @param mixed  $content
     * @param array  $attribute_defaults
     * @param array  $json_attrs
     * @return array{0: array, 1: bool} [attrs, is_preview]
     */
    private function buildShortcodeBlockAttrs($atts, $content, array $attribute_defaults, array $json_attrs = array()): array
    {
        global $block;

        $provided_atts = array_change_key_case((array) $atts, CASE_LOWER);

        $block_attrs = array();
        if (is_array($block) && isset($block['attrs']) && is_array($block['attrs'])) {
            $block_attrs = $block['attrs'];
        }

        $is_preview = is_admin();
        if (!$is_preview && did_action('elementor/loaded') && class_exists('\\Elementor\\Plugin')) {
            $plugin = \Elementor\Plugin::$instance;
            if (isset($plugin->preview) && method_exists($plugin->preview, 'is_preview_mode')) {
                $is_preview = $plugin->preview->is_preview_mode();
            }
        }

        $attrs = array();
        foreach ($attribute_defaults as $attr_name => $default_value) {
            // Support camelCase / kebab-case / snake_case variants for shortcodes
            $slugged = preg_replace('/([a-z])([A-Z])/', '$1-$2', $attr_name);
            $shortcode_keys = array_unique(
                array(
                    strtolower($attr_name),
                    strtolower(str_replace('-', '_', $slugged)),
                    strtolower($slugged),
                )
            );

            $has_shortcode_value = false;
            $shortcode_value = null;
            foreach ($shortcode_keys as $candidate_key) {
                if (array_key_exists($candidate_key, $provided_atts)) {
                    $shortcode_value = $provided_atts[$candidate_key];
                    $has_shortcode_value = true;
                    break;
                }
            }

            $block_value = array_key_exists($attr_name, $block_attrs) ? $block_attrs[$attr_name] : null;
            $value = $has_shortcode_value ? $shortcode_value : ($block_value ?? $default_value);

            // Decode JSON-like attributes if provided as a string in the shortcode
            if (is_string($value)) {
                $trimmed = trim($value);
                if ($trimmed !== '' && in_array($attr_name, $json_attrs, true)) {
                    $decoded = json_decode($value, true);
                    if (json_last_error() === JSON_ERROR_NONE) {
                        $value = $decoded;
                    }
                }
            }

            if (in_array($attr_name, $json_attrs, true) && is_object($value)) {
                $value = json_decode(wp_json_encode($value), true);
            }

            // Back-compat: accept { name, color } form for the single-color "colors" map
            if ($attr_name === 'colors' && is_array($value) && isset($value['name'], $value['color']) && count($value) === 2) {
                $value = array(
                    $value['name'] => $value['color'],
                );
            }

            $attrs[$attr_name] = $value;
        }

        // Content-based config (human friendly mini-YAML)
        $normalized_content = $this->normalizeShortcodeContent($content);
        if (is_string($normalized_content) && trim($normalized_content) !== '') {

            // a $normalized_content kulcsait ki kellene venni az attribútumok közül, mert 

            // base64 (standard, not url-safe)
            $attrs['configB64'] = base64_encode($normalized_content);

            // optional: versioning to allow changing format later
            $attrs['configFormat'] = 'yaml.v1';
        }

        return array($attrs, $is_preview);
    }

    /**
     * Render a dynamic Flow block from a shortcode.
     *
     * @param string $block_name
     * @param array  $attrs
     * @param bool   $is_preview
     * @return string
     */
    private function renderShortcodeBlock(string $block_name, array $block, array $attrs, bool $is_preview): string
    {
        $newBlock = array(
            'blockName' => $block_name,
            'attrs' => $attrs,
            'innerBlocks' => $block['innerBlocks'] ?? [],
            'innerHTML' => $block['innerHTML'] ?? '',
            'innerContent' => $block['innerContent'] ?? [],
        );

        $content = render_block($newBlock);
        $content = str_replace("smartcloud-flow-is-preview", ($is_preview ? 'true' : 'false'), $content);
        return $content;
    }

    /**
     * Shortcode handler for [smartcloud-flow-form pattern="123" ...]
     *
     * @param array $atts
     * @param string|null $content
     * @return string
     */
    public function shortcodeFlowForm($atts, $content = null): string
    {
        $atts = array_change_key_case((array) $atts, CASE_LOWER);
        $pattern_id = isset($atts['id']) ? intval($atts['id']) : 0;

        if (!$pattern_id) {
            return '<div class="smartcloud-flow-form-error">Missing pattern ID</div>';
        }

        // Fetch Gutenberg pattern (wp_block post)
        $pattern_post = get_post($pattern_id);
        if (!$pattern_post || $pattern_post->post_type !== 'wp_block') {
            return '<div class="smartcloud-flow-form-error">Invalid pattern ID</div>';
        }

        // Parse blocks from post content
        $blocks = parse_blocks($pattern_post->post_content);
        $form_block = null;
        foreach ($blocks as $block) {
            if ($block['blockName'] === 'smartcloud-flow/form') {
                $form_block = $block;
                break;
            }
        }
        if (!$form_block) {
            return '<div class="smartcloud-flow-form-error">Pattern does not contain a Flow Form block</div>';
        }
        // Default attributes from block
        $block_atts = $form_block['attrs'] ?? [];

        // Merge shortcode attributes (override block)
        $override_attribute_map = array(
            'formid' => 'formId',
            'formname' => 'formName',
            'submitlabel' => 'submitLabel',
            'successmessage' => 'successMessage',
            'errormessage' => 'errorMessage',
            'endpointpath' => 'endpointPath',
            'language' => 'language',
            'direction' => 'direction',
            'hideformonsuccess' => 'hideFormOnSuccess',
            'colormode' => 'colorMode',
            'primarycolor' => 'primaryColor',
            'themeoverrides' => 'themeOverrides',
            'allowdrafts' => 'allowDrafts',
            'showdraftresumepanel' => 'showDraftResumePanel',
            'draftexpirydays' => 'draftExpiryDays',
            'draftallowdelete' => 'draftAllowDelete',
            'draftresumetitle' => 'draftResumeTitle',
            'draftresumedescription' => 'draftResumeDescription',
            'draftsavesuccessmessage' => 'draftSaveSuccessMessage',
        );
        $boolean_override_keys = array(
            'hideFormOnSuccess',
            'allowDrafts',
            'showDraftResumePanel',
            'draftAllowDelete',
        );
        foreach ($override_attribute_map as $shortcode_key => $attribute_key) {
            if (!array_key_exists($shortcode_key, $atts)) {
                continue;
            }

            $value = $atts[$shortcode_key];

            if (in_array($attribute_key, $boolean_override_keys, true)) {
                if ($value === 'yes' || $value === 'true' || $value === '1' || $value === true) {
                    $value = true;
                } elseif ($value === 'no' || $value === 'false' || $value === '0' || $value === false || $value === '') {
                    $value = false;
                }
            }

            if ($attribute_key === 'draftExpiryDays' && $value !== '' && $value !== null) {
                $value = intval($value);
            }

            if ($value === '') {
                continue;
            }

            $block_atts[$attribute_key] = $value;
        }

        // Parse YAML config from shortcode content (if present)
        if ($content && is_string($content) && trim($content) !== '') {
            $yaml = [];
            $lines = explode("\n", $content);
            foreach ($lines as $line) {
                if (preg_match('/^([a-zA-Z0-9_]+):\s*(.+)$/', $line, $m)) {
                    $yaml[$m[1]] = $m[2];
                }
            }
            foreach ($yaml as $key => $value) {
                $block_atts[$key] = $value;
            }
        }

        // is_preview logic (Elementor, admin)
        $is_preview = is_admin();
        if (!$is_preview && did_action('elementor/loaded') && class_exists('\Elementor\Plugin')) {
            $plugin = \Elementor\Plugin::$instance;
            if (isset($plugin->preview) && method_exists($plugin->preview, 'is_preview_mode')) {
                $is_preview = $plugin->preview->is_preview_mode();
            }
        }

        // Get backend formId from pattern post meta
        $backend_form_id = null;
        if (class_exists('FormSyncMeta')) {
            $backend_form_id = FormSyncMeta::getFormId($pattern_id);
        }

        // Add backend formId to block attributes if available
        if ($backend_form_id) {
            $block_atts['backendFormId'] = $backend_form_id;
        }

        $attribute_defaults = array(
            'formId' => null,
            'formName' => null,
            'submitLabel' => null,
            'successMessage' => null,
            'errorMessage' => null,
            'endpointPath' => null,
            'language' => null,
            'direction' => null,
            'hideFormOnSuccess' => true,
            'allowDrafts' => null,
            'showDraftResumePanel' => null,
            'draftExpiryDays' => null,
            'draftAllowDelete' => null,
            'draftResumeTitle' => null,
            'draftResumeDescription' => null,
            'draftSaveSuccessMessage' => null,
            'colorMode' => null,
            'primaryColor' => null,
            'primaryShade' => null,
            'colors' => null,
            'uid' => strtolower(\function_exists('wp_generate_password') ? \wp_generate_password(8, false, false) : substr(md5(uniqid('', true)), 0, 8)),
            'themeOverrides' => null,
            'actions' => array(),
            'autoReplyTemplateKey' => null,
            'workflowIds' => array(),
            'backendFormId' => null,
        );

        list($attrs, $is_preview) = $this->buildShortcodeBlockAttrs(
            $block_atts,
            $content,
            $attribute_defaults,
            array('colors', 'primaryShade', 'themeOverrides')
        );

        return $this->renderShortcodeBlock('smartcloud-flow/form', $form_block, $attrs, $is_preview);
    }

    public function createAdminMenu(): void
    {
        $this->admin->addMenu();
    }

    private function enqueueMainRuntimeScript(): void
    {
        $main_script_asset = array();
        if (file_exists(filename: SMARTCLOUD_FLOW_PATH . 'main/index.asset.php')) {
            $main_script_asset = require(SMARTCLOUD_FLOW_PATH . 'main/index.asset.php');
        }
        $main_script_dependencies = array_merge(
            $main_script_asset['dependencies'] ?? array(),
            array('smartcloud-wpsuite-webcrypto-vendor', 'smartcloud-wpsuite-amplify-vendor', 'smartcloud-wpsuite-mantine-vendor')
        );
        if (wp_script_is('smartcloud-wpsuite-main-script', 'registered')) {
            $main_script_dependencies[] = 'smartcloud-wpsuite-main-script';
        }
        $main_script_asset['dependencies'] = array_values(array_unique($main_script_dependencies));
        wp_enqueue_script('smartcloud-flow-main-script', SMARTCLOUD_FLOW_URL . 'main/index.js', $main_script_asset['dependencies'], SMARTCLOUD_FLOW_VERSION, array('strategy' => 'defer'));
        //wp_enqueue_style('smartcloud-flow-main-style', SMARTCLOUD_FLOW_URL . 'main/index.css', array(), SMARTCLOUD_FLOW_VERSION);
        //add_editor_style(SMARTCLOUD_FLOW_URL . 'main/index.css');

        // Build data passed to JS.
        $settings = $this->admin->getSettings();
        $data = array(
            'key' => SMARTCLOUD_FLOW_SLUG,
            'version' => SMARTCLOUD_FLOW_VERSION,
            'status' => 'initializing',
            'plugin' => array(),
            'settings' => $settings,
            'restUrl' => rest_url(SMARTCLOUD_FLOW_SLUG . '/v1'),
            'baseUrl' => SMARTCLOUD_FLOW_URL,
            'nonce' => wp_create_nonce('wp_rest'),
        );
        $js = 'const __flowGlobal = (typeof globalThis !== "undefined") ? globalThis : window;
    __flowGlobal.WpSuite = __flowGlobal.WpSuite ?? {};
    __flowGlobal.WpSuite.plugins = __flowGlobal.WpSuite.plugins ?? {};
    __flowGlobal.WpSuite.events = __flowGlobal.WpSuite.events ?? {
      emit: (type, detail) => window.dispatchEvent(new CustomEvent(type, { detail })),
      on: (type, cb, opts) => window.addEventListener(type, cb, opts),
    };
    __flowGlobal.WpSuite.plugins.flow = __flowGlobal.WpSuite.plugins.flow ?? {};
Object.assign(__flowGlobal.WpSuite.plugins.flow, ' . wp_json_encode($data) . ');
__flowGlobal.WpSuite.constants = __flowGlobal.WpSuite.constants ?? {};
__flowGlobal.WpSuite.constants.flow = {
    mantineCssHref: "' . esc_url(SMARTCLOUD_WPSUITE_URL . 'assets/css/mantine-vendor.css') . '",
    operationsRuntimeCssHref: "' . esc_url(SMARTCLOUD_FLOW_URL . 'admin/operations-runtime.css') . '",
};
    var WpSuite = __flowGlobal.WpSuite;
';
        wp_add_inline_script('smartcloud-flow-main-script', $js, 'before');
    }

    private function enqueueFormViewAssets(): void
    {
        $this->registerOperationsRuntimeAssets();

        $view_script_asset = array();
        if (file_exists(filename: SMARTCLOUD_FLOW_PATH . 'blocks/view.asset.php')) {
            $view_script_asset = require(SMARTCLOUD_FLOW_PATH . 'blocks/view.asset.php');
        }
        $view_script_dependencies = array_merge(
            $view_script_asset['dependencies'] ?? array(),
            array('smartcloud-flow-main-script', 'smartcloud-flow-operations-runtime-script')
        );
        if (wp_script_is('smartcloud-wpsuite-main-script', 'registered')) {
            $view_script_dependencies[] = 'smartcloud-wpsuite-main-script';
        }
        $view_script_asset['dependencies'] = array_values(array_unique($view_script_dependencies));
        wp_enqueue_script('smartcloud-flow-view-script', SMARTCLOUD_FLOW_URL . 'blocks/view.js', $view_script_asset['dependencies'], SMARTCLOUD_FLOW_VERSION, array('strategy' => 'defer'));
    }

    public function enqueueFrontendAssets(): void
    {
        $this->enqueueMainRuntimeScript();
        $this->enqueueFormViewAssets();
    }

    public function enqueueAdminRuntimeAssets(): void
    {
        $this->enqueueMainRuntimeScript();
    }

    public function enqueueEditorAssets(): void
    {
        $this->enqueueMainRuntimeScript();
        $this->registerEditorRuntimeAssets();

        $this->attachEditorRuntimeDependencies();

        if (file_exists(SMARTCLOUD_FLOW_PATH . 'blocks/editor.css')) {
            wp_enqueue_style(
                'smartcloud-flow-blocks-editor-style',
                SMARTCLOUD_FLOW_URL . 'blocks/editor.css',
                array(),
                SMARTCLOUD_FLOW_VERSION
            );
        }
    }

    private function registerEditorRuntimeAssets(): void
    {
        $blocks_script_asset = array();
        if (file_exists(filename: SMARTCLOUD_FLOW_PATH . 'blocks/editor.asset.php')) {
            $blocks_script_asset = require(SMARTCLOUD_FLOW_PATH . 'blocks/editor.asset.php');
        }
        $blocks_script_asset['dependencies'] = array_merge($blocks_script_asset['dependencies'], array('smartcloud-flow-main-script'));
        wp_enqueue_script('smartcloud-flow-blocks-editor-script', SMARTCLOUD_FLOW_URL . 'blocks/editor.js', $blocks_script_asset['dependencies'], SMARTCLOUD_FLOW_VERSION, array('strategy' => 'defer'));
        wp_enqueue_style('smartcloud-flow-blocks-editor-style', SMARTCLOUD_FLOW_URL . 'blocks/editor.css', array(), SMARTCLOUD_FLOW_VERSION);
        add_editor_style(SMARTCLOUD_FLOW_URL . 'blocks/editor.css');

        $editor_runtime_script_path = SMARTCLOUD_FLOW_PATH . 'admin/editor-runtime.js';
        $editor_runtime_asset_path = SMARTCLOUD_FLOW_PATH . 'admin/editor-runtime.asset.php';

        if (file_exists($editor_runtime_script_path) && !wp_script_is('smartcloud-flow-editor-runtime-script', 'registered')) {
            $editor_runtime_asset = array();
            if (file_exists($editor_runtime_asset_path)) {
                $editor_runtime_asset = require($editor_runtime_asset_path);
            }

            $dependencies = array_unique(array_merge(
                $editor_runtime_asset['dependencies'] ?? array(),
                array(
                    'smartcloud-flow-main-script',
                    'smartcloud-wpsuite-webcrypto-vendor',
                    'smartcloud-wpsuite-amplify-vendor',
                    'smartcloud-wpsuite-mantine-vendor',
                )
            ));

            wp_register_script(
                'smartcloud-flow-editor-runtime-script',
                SMARTCLOUD_FLOW_URL . 'admin/editor-runtime.js',
                $dependencies,
                $editor_runtime_asset['version'] ?? SMARTCLOUD_FLOW_VERSION,
                array('strategy' => 'defer')
            );
        }
    }

    private function attachEditorRuntimeDependencies(): void
    {
        if (!class_exists('\WP_Block_Type_Registry')) {
            return;
        }

        $registry = \WP_Block_Type_Registry::get_instance();
        $scripts = wp_scripts();
        $required_deps = array('smartcloud-flow-main-script', 'smartcloud-flow-editor-runtime-script');

        foreach ($registry->get_all_registered() as $block_type) {
            if (!is_object($block_type) || !isset($block_type->name) || !str_starts_with((string) $block_type->name, 'smartcloud-flow/')) {
                continue;
            }

            $handles = isset($block_type->editor_script_handles) && is_array($block_type->editor_script_handles)
                ? $block_type->editor_script_handles
                : array();

            foreach ($handles as $handle) {
                if (!is_string($handle) || !isset($scripts->registered[$handle])) {
                    continue;
                }

                $scripts->registered[$handle]->deps = array_values(array_unique(array_merge(
                    $scripts->registered[$handle]->deps ?? array(),
                    $required_deps
                )));
            }
        }
    }

    private function registerOperationsRuntimeAssets(): void
    {
        $operations_runtime_script_path = SMARTCLOUD_FLOW_PATH . 'admin/operations-runtime.js';
        $operations_runtime_asset_path = SMARTCLOUD_FLOW_PATH . 'admin/operations-runtime.asset.php';

        if (file_exists($operations_runtime_script_path) && !wp_script_is('smartcloud-flow-operations-runtime-script', 'registered')) {
            $operations_runtime_asset = array();
            if (file_exists($operations_runtime_asset_path)) {
                $operations_runtime_asset = require($operations_runtime_asset_path);
            }

            $dependencies = array_unique(array_merge(
                $operations_runtime_asset['dependencies'] ?? array(),
                array(
                    'smartcloud-flow-main-script',
                    'smartcloud-wpsuite-webcrypto-vendor',
                    'smartcloud-wpsuite-mantine-vendor',
                )
            ));

            wp_register_script(
                'smartcloud-flow-operations-runtime-script',
                SMARTCLOUD_FLOW_URL . 'admin/operations-runtime.js',
                $dependencies,
                $operations_runtime_asset['version'] ?? SMARTCLOUD_FLOW_VERSION,
                array('strategy' => 'defer')
            );
        }
    }

    /**
     * Include admin classes or additional files.
     */
    public function registerWidgets(): void
    {
        if (file_exists(SMARTCLOUD_FLOW_PATH . 'flow-elementor-widgets.php')) {
            add_action('elementor/init', static function () {
                require_once SMARTCLOUD_FLOW_PATH . 'flow-elementor-widgets.php';
            });
        }
    }

    public function registerBlockCategory(array $categories, \WP_Block_Editor_Context $context): array
    {
        $categories[] = [
            'slug' => 'smartcloud-flow',
            'title' => __('SmartCloud Flow', 'smartcloud-flow'),
            'icon' => null,
        ];

        return $categories;
    }

    public function registerBlocks(): void
    {
        if (!function_exists('register_block_type')) {
            return;
        }

        $this->registerOperationsRuntimeAssets();

        foreach ($this->blocks as $block) {
            $metadata_path = SMARTCLOUD_FLOW_PATH . 'blocks/' . $block;
            if (file_exists($metadata_path . '/block.json')) {
                register_block_type($metadata_path);
            }
        }
    }

    private function includes(): void
    {
        if (file_exists(SMARTCLOUD_FLOW_PATH . 'vendor/autoload.php')) {
            require_once SMARTCLOUD_FLOW_PATH . 'vendor/autoload.php';
        }

        // Logger class
        if (file_exists(SMARTCLOUD_FLOW_PATH . 'admin/logger.php')) {
            require_once SMARTCLOUD_FLOW_PATH . 'admin/logger.php';
        }

        // Hub admin classes
        if (file_exists(SMARTCLOUD_FLOW_PATH . 'hub-loader.php')) {
            require_once SMARTCLOUD_FLOW_PATH . 'hub-loader.php';
        }

        // Admin classes
        if (file_exists(SMARTCLOUD_FLOW_PATH . 'admin/admin.php')) {
            require_once SMARTCLOUD_FLOW_PATH . 'admin/admin.php';
        }
        if (class_exists('\SmartCloud\WPSuite\Flow\Admin')) {
            $this->admin = new \SmartCloud\WPSuite\Flow\Admin();
        }
    }

    private function defineConstants(): void
    {
        define('SMARTCLOUD_FLOW_VERSION', VERSION);
        define('SMARTCLOUD_FLOW_SLUG', 'smartcloud-flow');
        define('SMARTCLOUD_FLOW_PATH', plugin_dir_path(__FILE__));
        define('SMARTCLOUD_FLOW_URL', plugin_dir_url(__FILE__));
    }

    private function normalizeShortcodeContent(?string $content): string
    {
        if (!is_string($content) || $content === '') {
            return '';
        }

        // Decode entities (editors sometimes entity-encode quotes etc.)
        $text = html_entity_decode($content, ENT_QUOTES, get_bloginfo('charset'));

        // Normalize newlines
        $text = str_replace("\r\n", "\n", $text);

        // Remove wpautop/editor wrapper tags while preserving line structure
        // </p><p> -> newline
        $text = preg_replace('~</p>\s*<p[^>]*>~i', "\n", $text);

        // <br> -> newline
        $text = preg_replace('~<br\s*/?>~i', "\n", $text);

        // Remove remaining <p> wrappers
        $text = preg_replace('~</?p[^>]*>~i', '', $text);

        // Common wrappers from some editors
        $text = preg_replace('~</?div[^>]*>~i', '', $text);
        $text = preg_replace('~</?span[^>]*>~i', '', $text);

        // NBSP -> space
        $text = str_replace("\xC2\xA0", ' ', $text);

        return trim($text);
    }
}


// Bootstrap plugin.
if (defined('SMARTCLOUD_FLOW_BOOTSTRAPPED')) {
    return;
}
define('SMARTCLOUD_FLOW_BOOTSTRAPPED', true);

add_action('init', 'SmartCloud\WPSuite\Flow\flowHubInit', 15);
add_action('init', 'SmartCloud\WPSuite\Flow\flowPluginInit', 20);
add_action('plugins_loaded', 'SmartCloud\WPSuite\Flow\flowLoaded', 20);
function flowHubInit()
{
    if (class_exists('\SmartCloud\WPSuite\Hub\FlowHubLoader')) {
        $loader = loader();
        $loader->init();
    }
}
function flowPluginInit()
{
    $instance = flow();
    $instance->init();
}
function flowLoaded()
{
    $instance = flow();
    if (class_exists('\SmartCloud\WPSuite\Hub\FlowHubLoader')) {
        $loader = loader();
        $loader->check();
    }

    $instance->registerWidgets();
}

/**
 * Accessor function
 *
 * @return \SmartCloud\WPSuite\Flow\Flow
 */
function flow()
{
    return Flow::instance();
}

/**
 * Accessor function
 *
 * @return \SmartCloud\WPSuite\Hub\FlowHubLoader
 */
function loader()
{
    return \SmartCloud\WPSuite\Hub\FlowHubLoader::instance('smartcloud-flow/smartcloud-flow.php', 'smartcloud-flow');
}
