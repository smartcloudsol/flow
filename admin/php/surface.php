<?php
namespace SmartCloud\WPSuite\Flow;

if (!defined('ABSPATH')) { exit; }
require_once __DIR__ . '/placement-inspection.php';

/** Local preferences only; service and workflow configuration stays in Advanced. */
final class AdminSurface
{
    private static function help(): array
    {
        $topics = array(
            array('form-synchronization', __('Form synchronization', 'smartcloud-flow'), __('This preference applies when a Flow backend is configured.', 'smartcloud-flow'), array(__('When enabled, Flow synchronizes form definitions with the configured backend. It does not create or connect a backend, and the preference alone does not confirm service availability.', 'smartcloud-flow'), __('You can author Flow Form blocks without a WP Suite connection. To submit to your own service, configure the form’s endpoint in the block editor.', 'smartcloud-flow'))),
            array('form-attribution', __('Powered by attribution', 'smartcloud-flow'), __('Choose whether forms show the Powered by attribution.', 'smartcloud-flow'), array(__('This preference controls attribution. Each form retains its authored content and appearance settings.', 'smartcloud-flow'))),
            array('submission-deletion', __('Permanent submission deletion', 'smartcloud-flow'), __('Advanced controls whether submissions may be permanently deleted.', 'smartcloud-flow'), array(__('This setting is managed in Advanced. It does not indicate whether a backend is configured or submissions exist.', 'smartcloud-flow'))),
            array('form-endpoint', __('Send a form to your own service', 'smartcloud-flow'), __('Configure the destination in the Flow Form block settings.', 'smartcloud-flow'), array(__('Insert Flow Form in a WordPress page. Select the form and set Endpoint path to your HTTPS URL, then choose Endpoint method (POST by default) and any Endpoint headers.', 'smartcloud-flow'), __('Submissions go from the visitor’s browser to your service. The service must process the request, return JSON and allow the site origin through CORS. Endpoint headers are visible in the browser: never place secrets there.', 'smartcloud-flow'), __('This custom endpoint does not provide WP Suite submission storage, discussions or workflows. Those features require a configured Flow backend.', 'smartcloud-flow'))),
            array('discussion-placement', __('Add a discussion', 'smartcloud-flow'), __('Flow Form collects comments; Flow Discussion displays them.', 'smartcloud-flow'), array(__('Insert Flow Form and Flow Discussion on a page. Enable discussion in the form’s block settings and configure the fields used for the author name and comment.', 'smartcloud-flow'), __('Use the same synchronized Form ID and content target for both blocks. Choose the current WordPress content, an explicit content reference, or the canonical page URL. Match the optional channel when several forms appear on one page.', 'smartcloud-flow'), __('A configured Flow backend is required to store comments, serve the discussion and enforce its moderation and authentication policy. Saving form preferences does not enable this service.', 'smartcloud-flow'))),
            array('rating-placement', __('Add ratings', 'smartcloud-flow'), __('A Rating field collects a score inside a Flow Form.', 'smartcloud-flow'), array(__('Insert Rating field inside Flow Form and choose its star count and fractional step in the block settings. For discussion ratings, select that field in the form’s discussion settings.', 'smartcloud-flow'), __('Discussion ratings belong to root comments, not replies. Flow Discussion can display the aggregate; insert Flow Rating Summary if the average and distribution should appear separately.', 'smartcloud-flow'), __('Flow Rating Summary uses the same synchronized Form ID, content target and optional channel as the form. Discussion ratings and their aggregates require a configured Flow backend. Only visible published root comments contribute.', 'smartcloud-flow'), __('Treat the star count and fractional step as fixed after ratings are published. Existing aggregate data needs explicit reconciliation before those settings change.', 'smartcloud-flow'))),
            array('modal-placement', __('Add a dialog', 'smartcloud-flow'), __('Use Flow Modal for content shown in a dialog.', 'smartcloud-flow'), array(__('Insert Flow Modal, add the Gutenberg content inside it and configure its trigger in the block settings.', 'smartcloud-flow'))),
            array('gallery-placement', __('Add an image gallery', 'smartcloud-flow'), __('Choose Gallery from the SmartCloud Flow category.', 'smartcloud-flow'), array(__('Insert Gallery from the SmartCloud Flow block category, choose its images and configure its presentation in the block settings.', 'smartcloud-flow'))),
            array('content-root-placement', __('Add Flow content and layout', 'smartcloud-flow'), __('Flow Content Root hosts Flow blocks outside a form.', 'smartcloud-flow'), array(__('Insert Flow Content Root and add the Flow display and layout blocks you want visitors to see inside it.', 'smartcloud-flow'))),
        );
        $topics[] = array('placement-methods', __('Blocks, widgets and shortcodes', 'smartcloud-flow'), __('Choose the placement method used by this site.', 'smartcloud-flow'), array(__('Gutenberg: insert Flow Form, Flow Discussion, Flow Modal, Gallery or Flow Content Root. Configure each block in the editor sidebar.', 'smartcloud-flow'), __('Elementor: the Flow Form, Flow Discussion, Flow Modal and Flow Content Root widgets render existing Flow patterns. Choose the pattern in the widget settings. Gallery can be included inside a content pattern.', 'smartcloud-flow'), __('For a reusable pattern, use [smartcloud-flow-form id="123"], [smartcloud-flow-discussion id="123"], [smartcloud-flow-modal id="123"] or [smartcloud-flow-content-root id="123"]. Replace 123 with the pattern ID; the pattern must contain the corresponding root block. The Flow Patterns screen provides copyable shortcodes for form, modal and content-root patterns.', 'smartcloud-flow')));
        return array_map(static fn(array $topic): array => array('id' => $topic[0], 'title' => $topic[1], 'summary' => $topic[2], 'paragraphs' => $topic[3]), $topics);
    }
    private static function revision(mixed $raw): string { return hash('sha256', serialize($raw)); }
    private static function error(string $message, int $status = 400): \WP_Error
    {
        return new \WP_Error('flow_surface', $message, array('status' => $status));
    }

    /** Placement guidance reuses Gutenberg and does not create or change content. */
    private static function useOnSite(): array
    {
        $pageLinks = array();
        $formLinks = array();
        if (current_user_can('edit_posts')) {
            $formLinks[] = array('label' => __('Browse Flow patterns', 'smartcloud-flow'), 'url' => admin_url('edit.php?post_type=wp_block&s=smartcloud-flow'));
        }
        $usage = PlacementInspection::usage();
        $status = static function (array $kinds) use ($usage): string {
            $ids = array();
            foreach ($kinds as $kind) { $ids = array_merge($ids, $usage['matches'][$kind] ?? array()); }
            $label = sprintf(__('Found on %d inspected published pages or posts', 'smartcloud-flow'), count(array_unique($ids)));
            return $label . ($usage['partial'] ? ' · ' . __('Partial inspection', 'smartcloud-flow') : '');
        };
        return array(
            'description' => __('Choose a block in the Gutenberg inserter. Counts cover inspected published pages and posts, including synchronized patterns; they do not include templates, shortcodes or Elementor placements.', 'smartcloud-flow'),
            'items' => array(
                array('id' => 'form', 'title' => __('Flow Form', 'smartcloud-flow'),
                    'description' => __('Collect visitor information and send it to your own service or a configured Flow backend.', 'smartcloud-flow'), 'help_id' => 'form-endpoint', 'status' => $status(array('form')),
                    'links' => $formLinks),
                array('id' => 'discussion', 'title' => __('Form + Discussion', 'smartcloud-flow'),
                    'description' => __('Collect comments with Flow Form and display them with Flow Discussion.', 'smartcloud-flow'), 'status' => $status(array('discussion')) . ' · ' . __('Requires a configured Flow backend', 'smartcloud-flow'), 'help_id' => 'discussion-placement', 'links' => $pageLinks),
                array('id' => 'rating', 'title' => __('Rating', 'smartcloud-flow'),
                    'description' => __('Collect scores with Rating field; display discussion averages with Flow Rating Summary.', 'smartcloud-flow'), 'status' => $status(array('rating-field', 'rating-summary')) . ' · ' . __('Discussion aggregates require a configured Flow backend', 'smartcloud-flow'), 'help_id' => 'rating-placement', 'links' => $pageLinks),
                array('id' => 'modal', 'title' => __('Flow Modal', 'smartcloud-flow'),
                    'description' => __('Insert Flow Modal to show Gutenberg content in a dialog.', 'smartcloud-flow'), 'help_id' => 'modal-placement', 'status' => $status(array('modal')),
                    'links' => $pageLinks),
                array('id' => 'gallery', 'title' => __('Gallery', 'smartcloud-flow'),
                    'description' => __('Insert Gallery from the SmartCloud Flow category to create a navigable image gallery.', 'smartcloud-flow'), 'help_id' => 'gallery-placement', 'status' => $status(array('gallery')),
                    'links' => $pageLinks),
                array('id' => 'content-root', 'title' => __('Flow Content Root', 'smartcloud-flow'),
                    'description' => __('Insert Flow Content Root to use Flow display and layout blocks outside a form.', 'smartcloud-flow'), 'help_id' => 'content-root-placement', 'status' => $status(array('content-root')),
                    'links' => $pageLinks),
            ),
        );
    }

    public static function read(): array|\WP_Error
    {
        if (!current_user_can('manage_options')) { return self::error(__('Forbidden', 'smartcloud-flow'), 403); }
        $raw = get_option(SMARTCLOUD_FLOW_SLUG, false);
        $settings = FlowAdminSettings::fromMixed($raw);
        $saved = is_object($raw) ? get_object_vars($raw) : (is_array($raw) ? $raw : array());
        $configured = (array_key_exists('formsBackendSyncEnabled', $saved) && is_bool($saved['formsBackendSyncEnabled']))
            || (array_key_exists('enablePoweredBy', $saved) && is_bool($saved['enablePoweredBy']));
        return array(
            'schema_version' => 1, 'configured' => $configured, 'can_edit' => true, 'can_setup' => false, 'revision' => self::revision($raw),
            'status' => array('state' => 'ready', 'label' => $configured ? __('Form preferences configured', 'smartcloud-flow') : __('Flow blocks available', 'smartcloud-flow')),
            'notice' => __('No initial settings are required to use Flow blocks. Configure each form’s submission destination in the editor. Backend access is checked separately.', 'smartcloud-flow'),
            'introduction' => array(
                'title' => __('Getting started with Forms & Workflows', 'smartcloud-flow'),
                'description' => __('Build the visitor experience in WordPress, then connect the processing it needs.', 'smartcloud-flow'),
                'items' => array(
                    array('title' => __('No subscription needed for the blocks', 'smartcloud-flow'), 'description' => __('Build forms, multi-step wizards, conditional fields, dialogs and galleries in Gutenberg without a WP Suite subscription. A form needs a configured submission destination to process entries.', 'smartcloud-flow')),
                    array('title' => __('Create your first form', 'smartcloud-flow'), 'description' => __('Insert Flow Form, add fields and layout blocks, and configure labels, validation and the submit action. Send entries to your own endpoint or a configured Flow backend. Preview and test before publishing.', 'smartcloud-flow')),
                    array('title' => __('Reuse patterns and explore components', 'smartcloud-flow'), 'description' => __('Browse Flow patterns for reusable layouts. The component cards below explain forms, discussions, ratings, modals, galleries and content roots, with help and inspected usage counts.', 'smartcloud-flow')),
                    array('title' => __('Add backend-powered features', 'smartcloud-flow'), 'description' => __('A connected Pro site with a configured Flow backend adds central submissions, saved form drafts, discussions, email templates, workflows and webhook automation. Configure these in Advanced settings and resources.', 'smartcloud-flow')),
                ),
            ),
            'help' => self::help(),
            'metrics' => array(
                array('label' => __('Form synchronization', 'smartcloud-flow'), 'help_id' => 'form-synchronization', 'value' => $settings->formsBackendSyncEnabled ? __('Enabled', 'smartcloud-flow') : __('Disabled', 'smartcloud-flow')),
                array('label' => __('Permanent submission deletion', 'smartcloud-flow'), 'help_id' => 'submission-deletion', 'value' => $settings->formsAllowPermanentDelete ? __('Allowed in Advanced', 'smartcloud-flow') : __('Disabled', 'smartcloud-flow')),
            ),
            'values' => array('formsBackendSyncEnabled' => $settings->formsBackendSyncEnabled, 'enablePoweredBy' => $settings->enablePoweredBy),
            'steps' => array(),
            'actions' => array(),
            'use_on_site' => self::useOnSite(),
            'links' => array(
                array('label' => __('API settings', 'smartcloud-flow'), 'url' => admin_url('admin.php?page=' . SMARTCLOUD_FLOW_SLUG . '&section=api-settings')),
                array('label' => __('Submissions', 'smartcloud-flow'), 'url' => admin_url('admin.php?page=' . SMARTCLOUD_FLOW_SLUG . '&section=submissions')),
                array('label' => __('Workflows', 'smartcloud-flow'), 'url' => admin_url('admin.php?page=' . SMARTCLOUD_FLOW_SLUG . '&section=workflows')),
            ),
            'runtime_plugin' => 'flow', 'runtime_fields' => array(
                array('label' => __('Pro backend transport', 'smartcloud-flow'), 'path' => 'backendTransport', 'format' => 'text'),
                array('label' => __('Pro backend API name', 'smartcloud-flow'), 'path' => 'backendApiName', 'format' => 'text'),
            ),
        );
    }

    public static function save(array $values, string $revision): array|\WP_Error
    {
        if (!current_user_can('manage_options')) { return self::error(__('Forbidden', 'smartcloud-flow'), 403); }
        $raw = get_option(SMARTCLOUD_FLOW_SLUG, false);
        if (!hash_equals(self::revision($raw), $revision)) { return self::error(__('Settings changed. Reload before saving.', 'smartcloud-flow'), 409); }
        if (!$values || array_diff(array_keys($values), array('formsBackendSyncEnabled', 'enablePoweredBy'))) {
            return self::error(__('Unsupported setting.', 'smartcloud-flow'));
        }
        foreach ($values as $value) {
            if (!is_bool($value)) { return self::error(__('Invalid setting.', 'smartcloud-flow')); }
        }
        $updated = is_object($raw) ? clone $raw : (is_array($raw) ? $raw : FlowAdminSettings::fromMixed($raw));
        foreach ($values as $key => $value) {
            if (is_array($updated)) { $updated[$key] = $value; } else { $updated->{$key} = $value; }
        }
        update_option(SMARTCLOUD_FLOW_SLUG, $updated);
        return self::read();
    }
}
