<?php
if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly.
}

$smartcloud_flow_attributes = is_array($attributes ?? null) ? $attributes : [];

$smartcloud_flow_context = [];
if (isset($block) && is_object($block) && isset($block->context) && is_array($block->context)) {
    $smartcloud_flow_context = $block->context;
}

$smartcloud_flow_form_hash = substr(md5(serialize($smartcloud_flow_attributes)), 0, 6) . '_' . wp_rand();
$smartcloud_flow_form_id = 'smartcloud-flow-form-' . $smartcloud_flow_form_hash;

// Get backend formId and runtime post context if available
$smartcloud_flow_post_id = 0;
if (!empty($smartcloud_flow_context['postId'])) {
    $smartcloud_flow_post_id = intval($smartcloud_flow_context['postId']);
} else {
    $smartcloud_flow_post_id = intval(get_the_ID());
}

$smartcloud_flow_post_type = '';
if (!empty($smartcloud_flow_context['postType'])) {
    $smartcloud_flow_post_type = sanitize_key($smartcloud_flow_context['postType']);
} elseif ($smartcloud_flow_post_id) {
    $smartcloud_flow_post_type = sanitize_key((string) get_post_type($smartcloud_flow_post_id));
}

$smartcloud_flow_post_slug = '';
if ($smartcloud_flow_post_id) {
    $smartcloud_flow_post_slug = sanitize_title((string) get_post_field('post_name', $smartcloud_flow_post_id));
}

$smartcloud_flow_post_title = '';
if ($smartcloud_flow_post_id) {
    $smartcloud_flow_post_title = wp_strip_all_tags((string) get_the_title($smartcloud_flow_post_id));
}

$smartcloud_flow_post_url = '';
if ($smartcloud_flow_post_id) {
    $smartcloud_flow_post_url = (string) get_permalink($smartcloud_flow_post_id);
}

$smartcloud_flow_backend_form_id = null;

if ($smartcloud_flow_post_id && class_exists('\SmartCloud\WPSuite\Flow\FormSyncMeta')) {
    $smartcloud_flow_backend_form_id = \SmartCloud\WPSuite\Flow\FormSyncMeta::getFormId($smartcloud_flow_post_id);
}

// Add backend formId to attributes if available
if ($smartcloud_flow_backend_form_id) {
    $smartcloud_flow_attributes['formId'] = $smartcloud_flow_backend_form_id;
}

$smartcloud_flow_wp_context = [];
if ($smartcloud_flow_post_id) {
    $smartcloud_flow_wp_context['postId'] = $smartcloud_flow_post_id;
}
if ($smartcloud_flow_post_slug !== '') {
    $smartcloud_flow_wp_context['postSlug'] = $smartcloud_flow_post_slug;
}
if ($smartcloud_flow_post_type !== '') {
    $smartcloud_flow_wp_context['postType'] = $smartcloud_flow_post_type;
}
if ($smartcloud_flow_post_title !== '') {
    $smartcloud_flow_wp_context['postTitle'] = $smartcloud_flow_post_title;
}
if ($smartcloud_flow_post_url !== '') {
    $smartcloud_flow_wp_context['postUrl'] = $smartcloud_flow_post_url;
}
if (!empty($smartcloud_flow_wp_context)) {
    $smartcloud_flow_attributes['wpContext'] = $smartcloud_flow_wp_context;
}

$smartcloud_flow_target_source = isset($smartcloud_flow_attributes['contentTargetSource'])
    ? (string) $smartcloud_flow_attributes['contentTargetSource']
    : 'wordpress-context';
$smartcloud_flow_content_ref = null;
if ($smartcloud_flow_target_source === 'wordpress-context' && $smartcloud_flow_post_id && $smartcloud_flow_post_type !== '') {
    $smartcloud_flow_content_ref = [
        'namespace' => 'wordpress',
        'type' => $smartcloud_flow_post_type,
        'id' => (string) $smartcloud_flow_post_id,
    ];
} elseif ($smartcloud_flow_target_source === 'explicit') {
    $smartcloud_flow_target_namespace = trim((string) ($smartcloud_flow_attributes['targetNamespace'] ?? ''));
    $smartcloud_flow_target_type = trim((string) ($smartcloud_flow_attributes['targetType'] ?? ''));
    $smartcloud_flow_target_id = trim((string) ($smartcloud_flow_attributes['targetId'] ?? ''));
    if ($smartcloud_flow_target_namespace !== '' && $smartcloud_flow_target_type !== '' && $smartcloud_flow_target_id !== '') {
        $smartcloud_flow_content_ref = [
            'namespace' => $smartcloud_flow_target_namespace,
            'type' => $smartcloud_flow_target_type,
            'id' => $smartcloud_flow_target_id,
        ];
    }
}
if (is_array($smartcloud_flow_content_ref)) {
    $smartcloud_flow_attributes['contentRef'] = $smartcloud_flow_content_ref;
}

// Encode all attributes into a single data-config attribute
$smartcloud_flow_form_config = base64_encode(wp_json_encode($smartcloud_flow_attributes));

$smartcloud_flow_div_attrs = [];
$smartcloud_flow_div_attrs[] = 'id="' . esc_attr($smartcloud_flow_form_id) . '"';
$smartcloud_flow_div_attrs[] = 'data-is-preview="' . esc_attr('smartcloud-flow-is-preview') . '"';
$smartcloud_flow_div_attrs[] = 'data-config="' . esc_attr($smartcloud_flow_form_config) . '"';
$smartcloud_flow_div_attrs[] = get_block_wrapper_attributes([
    'class' => 'smartcloud-flow-form',
]);

$smartcloud_flow_fallback = '';
if (isset($block) && is_object($block) && !empty($block->inner_blocks)) {
    foreach ($block->inner_blocks as $smartcloud_flow_inner_block) {
        if (($smartcloud_flow_inner_block->name ?? '') === 'wpsuite/react-fallback') {
            $smartcloud_flow_fallback .= $smartcloud_flow_inner_block->render();
        }
    }
}

?>
<div <?php echo wp_kses_data(implode(' ', $smartcloud_flow_div_attrs)); ?>>
    <?php
    // WP_Block::render() returns display-ready markup for the authored fallback block and its children.
    // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
    echo $smartcloud_flow_fallback;
    ?>
    <div class="smartcloud-flow-form__mount"></div>
    <div class="smartcloud-flow-form__config" hidden>
        <?php echo wp_kses_post($content); ?>
    </div>
</div>
