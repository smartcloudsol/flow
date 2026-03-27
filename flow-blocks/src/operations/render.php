<?php
if (!defined('ABSPATH')) {
    exit;
}

$smartcloud_flow_operations_attributes = is_array($attributes ?? null) ? $attributes : [];

$smartcloud_flow_operations_hash = substr(md5(serialize($smartcloud_flow_operations_attributes)), 0, 6) . '_' . wp_rand();
$smartcloud_flow_operations_id = 'smartcloud-flow-operations-' . $smartcloud_flow_operations_hash;
$smartcloud_flow_operations_config = base64_encode(wp_json_encode($smartcloud_flow_operations_attributes));

$smartcloud_flow_operations_attrs = [];
$smartcloud_flow_operations_attrs[] = 'id="' . esc_attr($smartcloud_flow_operations_id) . '"';
$smartcloud_flow_operations_attrs[] = 'data-config="' . esc_attr($smartcloud_flow_operations_config) . '"';
$smartcloud_flow_operations_attrs[] = 'data-smartcloud-flow-operations="true"';
$smartcloud_flow_operations_attrs[] = get_block_wrapper_attributes([
    'class' => 'smartcloud-flow-operations',
]);
?>
<div <?php echo wp_kses_data(implode(' ', $smartcloud_flow_operations_attrs)); ?>></div>