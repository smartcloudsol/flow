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

if ($smartcloud_flow_post_id && class_exists('FormSyncMeta')) {
    $smartcloud_flow_backend_form_id = FormSyncMeta::getFormId($smartcloud_flow_post_id);
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

// Encode all attributes into a single data-config attribute
$smartcloud_flow_form_config = base64_encode(wp_json_encode($smartcloud_flow_attributes));

$smartcloud_flow_div_attrs = [];
$smartcloud_flow_div_attrs[] = 'id="' . esc_attr($smartcloud_flow_form_id) . '"';
$smartcloud_flow_div_attrs[] = 'data-is-preview="' . esc_attr('smartcloud-flow-is-preview') . '"';
$smartcloud_flow_div_attrs[] = 'data-config="' . esc_attr($smartcloud_flow_form_config) . '"';
$smartcloud_flow_div_attrs[] = get_block_wrapper_attributes([
    'class' => 'smartcloud-flow-form',
]);
?>
<div <?php echo wp_kses_data(implode(' ', $smartcloud_flow_div_attrs)); ?>>
    <div class="smartcloud-flow-form__mount"></div>
    <div class="smartcloud-flow-form__config" hidden>
        <?php echo wp_kses_post($content); ?>
    </div>
</div>