<?php
namespace SmartCloud\WPSuite\Flow;

use WP_Error;
use WP_REST_Request;
use WP_REST_Response;
use SmartCloud\WPSuite\Flow\Logger;

if (!defined('ABSPATH')) {
    exit;
}

if (file_exists(filename: SMARTCLOUD_FLOW_PATH . 'admin/model.php')) {
    require_once SMARTCLOUD_FLOW_PATH . 'admin/model.php';
}

if (file_exists(filename: SMARTCLOUD_FLOW_PATH . 'admin/form-sync-meta.php')) {
    require_once SMARTCLOUD_FLOW_PATH . 'admin/form-sync-meta.php';
}

final class Admin
{
    private FlowAdminSettings $settings;

    public function __construct()
    {
        $defaultSettings = new FlowAdminSettings(
            enablePoweredBy: false,
            defaultOutputLanguage: "",
            debugLoggingEnabled: false,
            formsBackendSyncEnabled: true,
            formsAllowPermanentDelete: false,
            highlightedSubmissionActions: ['seen', 'resolved', 'completed']
        );

        // WP can return array/object depending on previous versions / serialization.
        $raw = get_option(SMARTCLOUD_FLOW_SLUG);

        // Merge missing properties from defaultSettings
        $merged = array_merge(
            (array) $defaultSettings,
            is_object($raw) ? (array) $raw : (is_array($raw) ? $raw : [])
        );

        $this->settings = FlowAdminSettings::fromMixed($merged);
        $this->registerRestRoutes();
        require_once __DIR__ . '/placement-inspection.php';
        PlacementInspection::registerHooks();
        add_filter('smartcloud_wpsuite_admin_capabilities', array($this, 'registerHubCapabilities'));
        add_action('pre_get_posts', array($this, 'filterPatternListQuery'));
    }

    /** Register navigation without depending on a particular hub generation. */
    public function registerHubCapabilities(array $capabilities): array
    {
        require_once __DIR__ . '/surface.php';
        $capabilities[] = array(
            'schema_version' => 1,
            'id' => 'forms-workflows',
            'configuration_reset' => array(
                'options' => array(SMARTCLOUD_FLOW_SLUG),
                'title' => __('Reset all Flow settings?', 'smartcloud-flow'),
                'consequences' => array(__('Restores all WordPress-stored Flow preferences to defaults, including form synchronization, permanent-deletion preferences, highlighted submission actions, attribution and diagnostics.', 'smartcloud-flow')),
                'preserved' => array(__('Forms, submissions, discussions, patterns, authored blocks and their settings are preserved. The shared site connection, cloud-managed API settings, workflows, templates, process maps, webhooks and AWS resources are unchanged.', 'smartcloud-flow')),
            ),
            'surface_provider' => array(AdminSurface::class, 'read'),
            'detail_page' => SMARTCLOUD_FLOW_SLUG,
            'detail_enqueue' => array(self::class, 'enqueueAssets'),
            'backend_enqueue' => array(self::class, 'enqueueBackendCheck'),
            'surface_save' => array(AdminSurface::class, 'save'),
            'surface_capability' => 'manage_options',
            'product_id' => 'smartcloud-flow',
            'label' => __('Forms & Workflows', 'smartcloud-flow'),
            'product' => __('Flow', 'smartcloud-flow'),
            'description' => __('Build forms and automate what happens after submission.', 'smartcloud-flow'),
            'order' => 50,
            'primary_url' => admin_url('admin.php?page=' . SMARTCLOUD_FLOW_SLUG),
            'primary_label' => __('Configure Forms & Workflows', 'smartcloud-flow'),
            'required_capability' => 'manage_options',
            'advanced_links' => array(
                array('label' => __('General preferences', 'smartcloud-flow'), 'url' => admin_url('admin.php?page=' . SMARTCLOUD_FLOW_SLUG), 'required_capability' => 'manage_options'),
                array('label' => __('API settings', 'smartcloud-flow'), 'url' => admin_url('admin.php?page=' . SMARTCLOUD_FLOW_SLUG . '&section=api-settings'), 'required_capability' => 'manage_options'),
                array('label' => __('Submissions', 'smartcloud-flow'), 'url' => admin_url('admin.php?page=' . SMARTCLOUD_FLOW_SLUG . '&section=submissions'), 'required_capability' => 'manage_options'),
                array('label' => __('Workflows', 'smartcloud-flow'), 'url' => admin_url('admin.php?page=' . SMARTCLOUD_FLOW_SLUG . '&section=workflows'), 'required_capability' => 'manage_options'),
                array('label' => __('Flow Patterns', 'smartcloud-flow'), 'url' => admin_url('edit.php?post_type=wp_block&s=smartcloud-flow'), 'required_capability' => 'edit_posts'),
            ),
            'quick_links' => array(
                array('label' => __('Create a page with a form', 'smartcloud-flow'), 'url' => admin_url('post-new.php?post_type=page'), 'required_capability' => 'edit_pages'),
                array('label' => __('Flow Patterns', 'smartcloud-flow'), 'url' => admin_url('edit.php?post_type=wp_block&s=smartcloud-flow'), 'required_capability' => 'edit_posts'),
            ),
            'legacy_menu_slugs' => array(SMARTCLOUD_FLOW_SLUG, admin_url('edit.php?post_type=wp_block&s=smartcloud-flow')),
        );
        return $capabilities;
    }

    public function getSettings(): FlowAdminSettings
    {
        return $this->settings;
    }

    private function isSupportedFormSyncPostType(string $post_type): bool
    {
        if ($post_type === '') {
            return false;
        }

        $explicit_types = array(
            'wp_block',
            'wp_template',
            'wp_template_part',
            'smartcloud_flow_form',
        );

        return in_array($post_type, $explicit_types, true)
            || post_type_supports($post_type, 'editor');
    }

    private function getFormSyncSourcePost(int $post_id): ?\WP_Post
    {
        if ($post_id <= 0 || wp_is_post_revision($post_id) || wp_is_post_autosave($post_id)) {
            return null;
        }

        $post = get_post($post_id);
        if (!$post instanceof \WP_Post) {
            return null;
        }

        return $this->isSupportedFormSyncPostType((string) $post->post_type)
            ? $post
            : null;
    }

    public function addMenu(): void
    {
        $page = add_submenu_page(
            SMARTCLOUD_WPSUITE_CANONICAL_SLUG,
            __('Flow Settings', 'smartcloud-flow'),
            __('Flow Settings', 'smartcloud-flow'),
            'manage_options',
            SMARTCLOUD_FLOW_SLUG,
            [$this, 'renderPage']
        );

        add_submenu_page(
            SMARTCLOUD_WPSUITE_CANONICAL_SLUG,
            __('Flow Patterns', 'smartcloud-flow'),
            __('Flow Patterns', 'smartcloud-flow'),
            'edit_posts',
            admin_url('edit.php?post_type=wp_block&s=smartcloud-flow'),
        );

        add_action('admin_enqueue_scripts', function (string $hook) use ($page): void {
            if ($hook !== $page) {
                return;
            }

            $this->enqueueAssets();
        });

        add_filter('parent_file', array($this, 'highlightMenu'));
        add_filter('submenu_file', array($this, 'highlightSubmenu'));

        $post_type = filter_input(INPUT_GET, 'post_type', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $search = filter_input(INPUT_GET, 's', FILTER_SANITIZE_FULL_SPECIAL_CHARS);

        if ($this->isFlowPatternsRequest($post_type, $search)) {
            add_filter('manage_edit-wp_block_columns', array($this, 'addShortcodeColumn'), 20);
            add_action('manage_wp_block_posts_custom_column', array($this, 'renderShortcodeColumn'), 10, 2);
            add_action('admin_enqueue_scripts', array($this, 'copyShortcode'));
        }

    }

    private function isFlowPatternsRequest(?string $post_type = null, ?string $search = null): bool
    {
        $resolved_post_type = $post_type;
        if ($resolved_post_type === null) {
            $resolved_post_type = filter_input(INPUT_GET, 'post_type', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        }

        $resolved_search = $search;
        if ($resolved_search === null) {
            $resolved_search = filter_input(INPUT_GET, 's', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        }

        return 'wp_block' === $resolved_post_type && 'smartcloud-flow' === $resolved_search;
    }

    public function filterPatternListQuery($query): void
    {
        if (
            !is_admin()
            || !($query instanceof \WP_Query)
            || !$query->is_main_query()
            || $query->get('flow_pattern_lookup')
            || !$this->isFlowPatternsRequest((string) $query->get('post_type'), (string) $query->get('s'))
        ) {
            return;
        }

        $pattern_ids = $this->getFlowPatternIds();

        $query->set('post__in', !empty($pattern_ids) ? $pattern_ids : array(0));
    }

    private function getFlowPatternIds(): array
    {
        $candidate_ids = get_posts(array(
            'post_type' => 'wp_block',
            'post_status' => 'any',
            'posts_per_page' => -1,
            'fields' => 'ids',
            'orderby' => 'ID',
            'order' => 'ASC',
            'no_found_rows' => true,
            'flow_pattern_lookup' => true,
        ));

        return array_values(array_filter(
            array_map('intval', $candidate_ids),
            array($this, 'isFlowPatternPost')
        ));
    }

    private function getFlowPatternShortcodes(int $post_id): array
    {
        $post = get_post($post_id);

        if (!($post instanceof \WP_Post) || 'wp_block' !== $post->post_type) {
            return array();
        }

        $blocks = parse_blocks((string) $post->post_content);
        $shortcodes = array();

        foreach ($blocks as $block) {
            $block_name = is_array($block) ? ($block['blockName'] ?? '') : '';

            if ('smartcloud-flow/form' === $block_name) {
                $shortcodes['form'] = sprintf('[smartcloud-flow-form id="%d"]', $post_id);
                continue;
            }

            if ('smartcloud-flow/content-root' === $block_name) {
                $shortcodes['content-root'] = sprintf('[smartcloud-flow-content-root id="%d"]', $post_id);
                continue;
            }

            if ('smartcloud-flow/modal' === $block_name) {
                $shortcodes['modal'] = sprintf('[smartcloud-flow-modal id="%d"]', $post_id);
            }
        }

        return array_values($shortcodes);
    }

    private function isFlowPatternPost(int $post_id): bool
    {
        return !empty($this->getFlowPatternShortcodes($post_id));
    }

    public function addShortcodeColumn($columns)
    {
        $columns['wpc_shortcode'] = __('Shortcode', 'smartcloud-flow');
        return $columns;
    }

    public function renderShortcodeColumn($column, $post_id)
    {
        if ('wpc_shortcode' !== $column) {
            return;
        }

        $shortcodes = $this->getFlowPatternShortcodes((int) $post_id);
        if (empty($shortcodes)) {
            return;
        }

        $copy_label = esc_html__('Copy', 'smartcloud-flow');
        $rows = array();
        $allowed_html = array(
            'div' => array(
                'class' => true,
            ),
            'span' => array(
                'class' => true,
                'id' => true,
            ),
            'code' => array(),
            'a' => array(
                'href' => true,
                'class' => true,
                'data-target' => true,
            ),
        );

        foreach ($shortcodes as $index => $shortcode) {
            $target_id = sprintf('wpc-sc-%1$d-%2$d', (int) $post_id, (int) $index);

            $rows[] = sprintf(
                '<div class="wpc-shortcode-row"><span class="wpc-shortcode" id="%1$s"><code>%2$s</code></span><div class="row-actions"><span class="copy"><a href="#" class="wpc-copy" data-target="%1$s">%3$s</a></span></div></div>',
                esc_attr($target_id),
                esc_html($shortcode),
                $copy_label
            );
        }

        echo wp_kses(implode('', $rows), $allowed_html);
    }

    public function copyShortcode($hook)
    {

        // Csak a „Blokkok” (wp_block) listán van rá szükség
        $screen = get_current_screen();
        if ('edit.php' !== $hook || 'wp_block' !== $screen->post_type) {
            return;
        }

        wp_add_inline_script(
            'jquery-core',
            "
            (function($){
                function copyText( text, onSuccess, onFail ) {
    
                    if ( navigator.clipboard && window.isSecureContext ) {
                        navigator.clipboard.writeText( text )
                            .then( onSuccess )
                            .catch( function(){ legacyCopy( text, onSuccess, onFail ); } );
                        return;
                    }
    
                    legacyCopy( text, onSuccess, onFail );
                }
    
                function legacyCopy( text, onSuccess, onFail ) {
                    var \$tmp = $('<textarea readonly>')
                        .css({position:'absolute',left:'-9999px',top:0,opacity:0})
                        .val( text )
                        .appendTo('body')
                        .select();
    
                    try {
                        if ( document.execCommand('copy') ) {
                            onSuccess();
                            \$tmp.remove();
                            return;
                        }
                    } catch(e) {}
    
                    \$tmp.remove();
                    onFail();
                }
    
                $(document).on('click', '.wpc-copy', function(e){
                    e.preventDefault();
    
                    var \$btn   = $(this),
                        orig   = \$btn.text(),
                        text   = $('#' + \$btn.data('target')).text();
    
                    function showOk(){
                        \$btn.text( '" . esc_js(__('Copied!', 'smartcloud-flow')) . "' );
                        setTimeout( function(){ \$btn.text( orig ); }, 1500 );
                    }
                    function showFail(){
                        window.prompt( '" . esc_js(__('Copy manually (Ctrl+C):', 'smartcloud-flow')) . "', text );
                    }
    
                    copyText( text, showOk, showFail );
                });
            })(jQuery);
            "
        );
    }
    public function highlightMenu($parent_file)
    {
        if ($this->isFlowPatternsRequest((string) get_query_var('post_type'), (string) get_query_var('s'))) {
            return SMARTCLOUD_WPSUITE_CANONICAL_SLUG;
        }
        return $parent_file;
    }

    public function highlightSubmenu($submenu_file)
    {
        if ($this->isFlowPatternsRequest((string) get_query_var('post_type'), (string) get_query_var('s'))) {
            return admin_url("edit.php?post_type=wp_block&s=smartcloud-flow");
        }
        return $submenu_file;
    }

    public static function enqueueAssets(): void
    {
        flow()->enqueueAdminRuntimeAssets();

        $script_asset = array();
        if (file_exists(filename: SMARTCLOUD_FLOW_PATH . 'admin/index.asset.php')) {
            $script_asset = require_once(SMARTCLOUD_FLOW_PATH . 'admin/index.asset.php');
        }
        $asset_version = $script_asset['version'] ?? SMARTCLOUD_FLOW_VERSION;
        $script_asset['dependencies'] = array_merge(
            $script_asset['dependencies'],
            array(
                'smartcloud-flow-main-script',
                'smartcloud-wpsuite-webcrypto-vendor',
                'smartcloud-wpsuite-mantine-vendor'
            )
        );
        wp_enqueue_script('smartcloud-flow-admin-script', SMARTCLOUD_FLOW_URL . 'admin/index.js', $script_asset['dependencies'], $asset_version, array('in_footer' => true, 'strategy' => 'defer'));

        if (function_exists('wp_set_script_translations')) {
            wp_set_script_translations('smartcloud-flow-admin-script', 'smartcloud-flow', SMARTCLOUD_FLOW_PATH . 'languages');
        }

        wp_enqueue_style(
            'smartcloud-flow-admin-style',
            SMARTCLOUD_FLOW_URL . 'admin/index.css',
            [],
            $asset_version
        );
        wp_enqueue_style(
            'smartcloud-mantine-vendor-style',
            SMARTCLOUD_WPSUITE_URL . 'assets/css/mantine-vendor.css',
            [],
            defined('SMARTCLOUD_WPSUITE_MANTINE_VERSION') ? SMARTCLOUD_WPSUITE_MANTINE_VERSION : SMARTCLOUD_FLOW_VERSION
        );
    }

    public static function enqueueBackendCheck(): void
    {
        flow()->enqueueAdminRuntimeAssets();
        $assetPath = SMARTCLOUD_FLOW_PATH . 'admin/backend-readiness.asset.php';
        if (!file_exists($assetPath)) { return; }
        $asset = require $assetPath;
        wp_enqueue_script('smartcloud-flow-backend-check', SMARTCLOUD_FLOW_URL . 'admin/backend-readiness.js',
            array_merge($asset['dependencies'] ?? array(), array('smartcloud-flow-main-script')),
            $asset['version'] ?? SMARTCLOUD_FLOW_VERSION, array('in_footer' => true, 'strategy' => 'defer'));
    }

    public function renderPage(): void
    {
        echo '<div id="smartcloud-flow-admin"></div>';
    }

    public function initRestApi(): void
    {
        register_rest_route(
            SMARTCLOUD_FLOW_SLUG . '/v1',
            '/update-settings',
            array(
                'methods' => 'POST',
                'callback' => array($this, 'updateSettings'),
                'permission_callback' => function () {
                    if (!current_user_can('manage_options')) {
                        return new WP_Error('rest_forbidden', esc_html__('Forbidden', 'smartcloud-flow'), array('status' => 403));
                    }
                    return true;
                },
            )
        );

        // Form sync metadata endpoints
        register_rest_route(
            SMARTCLOUD_FLOW_SLUG . '/v1',
            '/forms/(?P<post_id>\d+)/sync-meta',
            array(
                'methods' => 'GET',
                'callback' => array($this, 'getFormSyncMeta'),
                'permission_callback' => function () {
                    return current_user_can('edit_posts');
                },
                'args' => array(
                    'post_id' => array(
                        'required' => true,
                        'validate_callback' => function ($param) {
                            return is_numeric($param);
                        }
                    ),
                ),
            )
        );

        register_rest_route(
            SMARTCLOUD_FLOW_SLUG . '/v1',
            '/forms/(?P<post_id>\d+)/sync-meta',
            array(
                'methods' => 'POST',
                'callback' => array($this, 'updateFormSyncMeta'),
                'permission_callback' => function () {
                    return current_user_can('edit_posts');
                },
                'args' => array(
                    'post_id' => array(
                        'required' => true,
                        'validate_callback' => function ($param) {
                            return is_numeric($param);
                        }
                    ),
                ),
            )
        );
    }

    public function updateSettings(WP_REST_Request $request): WP_REST_Response
    {
        $settings_param = $request->get_json_params();
        if (!is_array($settings_param) || empty($settings_param)) {
            // Fallback if body wasn't parsed as JSON for some reason.
            $decoded = json_decode($request->get_body(), true);
            $settings_param = is_array($decoded) ? $decoded : [];
        }

        $defaultOutputLanguage = isset($settings_param['defaultOutputLanguage'])
            ? (string) $settings_param['defaultOutputLanguage']
            : "";

        $debugLoggingEnabled = (bool) ($settings_param['debugLoggingEnabled'] ?? false);

        $this->settings = new FlowAdminSettings(
            enablePoweredBy: (bool) ($settings_param['enablePoweredBy'] ?? false),
            defaultOutputLanguage: $defaultOutputLanguage,
            debugLoggingEnabled: $debugLoggingEnabled,
            formsBackendSyncEnabled: (bool) ($settings_param['formsBackendSyncEnabled'] ?? true),
            formsAllowPermanentDelete: (bool) ($settings_param['formsAllowPermanentDelete'] ?? false),
            highlightedSubmissionActions: is_array($settings_param['highlightedSubmissionActions'] ?? null) ? $settings_param['highlightedSubmissionActions'] : ['seen', 'resolved', 'completed']
        );

        // Frissített beállítások mentése
        update_option(SMARTCLOUD_FLOW_SLUG, $this->settings);

        Logger::info('Flow settings updated', [
            'debugLoggingEnabled' => $debugLoggingEnabled,
            'enablePoweredBy' => $this->settings->enablePoweredBy,
            'defaultOutputLanguage' => $defaultOutputLanguage,
            'formsBackendSyncEnabled' => $this->settings->formsBackendSyncEnabled,
            'formsAllowPermanentDelete' => $this->settings->formsAllowPermanentDelete,
            'highlightedSubmissionActions' => $this->settings->highlightedSubmissionActions
        ]);

        return new WP_REST_Response(array('success' => true, 'message' => __('Settings updated successfully.', 'smartcloud-flow')), 200);
    }

    public function getFormSyncMeta(WP_REST_Request $request): WP_REST_Response
    {
        $post_id = (int) $request->get_param('post_id');

        $post = $this->getFormSyncSourcePost($post_id);

        if (!$post) {
            return new WP_REST_Response(
                array('error' => 'Invalid post ID or unsupported post type'),
                404
            );
        }

        $meta = FormSyncMeta::getAllSyncMeta($post_id);

        return new WP_REST_Response($meta, 200);
    }

    public function updateFormSyncMeta(WP_REST_Request $request): WP_REST_Response
    {
        $post_id = (int) $request->get_param('post_id');

        $post = $this->getFormSyncSourcePost($post_id);

        if (!$post) {
            return new WP_REST_Response(
                array('error' => 'Invalid post ID or unsupported post type'),
                404
            );
        }

        $body = $request->get_json_params();
        if (!is_array($body)) {
            $decoded = json_decode($request->get_body(), true);
            $body = is_array($decoded) ? $decoded : [];
        }

        // Update each meta field if provided
        if (array_key_exists('formId', $body)) {
            FormSyncMeta::setFormId(
                $post_id,
                $body['formId'] === null ? null : (string) $body['formId']
            );
        }
        if (array_key_exists('syncHash', $body)) {
            FormSyncMeta::setSyncHash(
                $post_id,
                $body['syncHash'] === null ? null : (string) $body['syncHash']
            );
        }
        if (array_key_exists('syncStatus', $body)) {
            FormSyncMeta::setSyncStatus($post_id, (string) $body['syncStatus']);
        }
        if (array_key_exists('lastSynced', $body)) {
            FormSyncMeta::setLastSynced(
                $post_id,
                $body['lastSynced'] === null ? null : (string) $body['lastSynced']
            );
        }
        if (array_key_exists('lastError', $body)) {
            FormSyncMeta::setLastError(
                $post_id,
                $body['lastError'] === null ? null : (string) $body['lastError']
            );
        }
        if (array_key_exists('sourceKind', $body)) {
            FormSyncMeta::setSourceKind(
                $post_id,
                $body['sourceKind'] === null ? null : (string) $body['sourceKind']
            );
        }

        $updated_meta = FormSyncMeta::getAllSyncMeta($post_id);

        return new WP_REST_Response($updated_meta, 200);
    }

    private function registerRestRoutes()
    {
        if (!class_exists('WP_REST_Controller')) {
            return;
        }

        add_action('rest_api_init', array($this, 'initRestApi'));
    }
}
