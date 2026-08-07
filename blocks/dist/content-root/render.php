<?php
if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly.
}

$smartcloud_flow_attributes = is_array($attributes ?? null) ? $attributes : [];

$smartcloud_flow_root_hash = substr(md5(serialize($smartcloud_flow_attributes)), 0, 6) . '_' . wp_rand();
$smartcloud_flow_root_id = 'smartcloud-flow-content-root-' . $smartcloud_flow_root_hash;
$smartcloud_flow_root_config = base64_encode(wp_json_encode($smartcloud_flow_attributes));

$smartcloud_flow_div_attrs = [];
$smartcloud_flow_div_attrs[] = 'id="' . esc_attr($smartcloud_flow_root_id) . '"';
$smartcloud_flow_div_attrs[] = 'data-config="' . esc_attr($smartcloud_flow_root_config) . '"';
$smartcloud_flow_div_attrs[] = get_block_wrapper_attributes([
    'class' => 'smartcloud-flow-content-root',
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
    <div class="smartcloud-flow-content-root__mount"></div>
    <div class="smartcloud-flow-content-root__config" hidden>
        <?php echo wp_kses_post($content); ?>
    </div>
</div>
