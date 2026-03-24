<?php
if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly.
}

$smartcloud_flow_attributes = is_array($attributes ?? null) ? $attributes : [];

$smartcloud_flow_form_hash = substr(md5(serialize($smartcloud_flow_attributes)), 0, 6) . '_' . wp_rand();
$smartcloud_flow_form_id = 'smartcloud-flow-form-' . $smartcloud_flow_form_hash;

// Get backend formId from post meta if available
$smartcloud_flow_post_id = get_the_ID();
$smartcloud_flow_backend_form_id = null;

if ($smartcloud_flow_post_id && class_exists('FormSyncMeta')) {
    $smartcloud_flow_backend_form_id = FormSyncMeta::getFormId($smartcloud_flow_post_id);
}

// Add backend formId to attributes if available
if ($smartcloud_flow_backend_form_id) {
    $smartcloud_flow_attributes['formId'] = $smartcloud_flow_backend_form_id;
}

// Encode all attributes into a single data-config attribute
$smartcloud_flow_form_config = base64_encode(wp_json_encode($smartcloud_flow_attributes));

// Build the attribute string
$smartcloud_flow_div_attrs = [];
$smartcloud_flow_div_attrs[] = 'id="' . $smartcloud_flow_form_id . '"';
$smartcloud_flow_div_attrs[] = 'class="smartcloud-flow-form"';
$smartcloud_flow_div_attrs[] = 'data-is-preview="smartcloud-flow-is-preview"';
$smartcloud_flow_div_attrs[] = 'data-config="' . $smartcloud_flow_form_config . '"';

// Add block wrapper attributes
$smartcloud_flow_div_attrs[] = get_block_wrapper_attributes();
?>
<div <?php echo wp_kses_data(implode(' ', $smartcloud_flow_div_attrs)); ?>>
    <div class="smartcloud-flow-form__mount"></div>
    <div class="smartcloud-flow-form__config" hidden>
        <?php echo wp_kses_post($content); ?>
    </div>
</div>