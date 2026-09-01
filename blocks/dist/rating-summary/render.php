<?php
if (!defined('ABSPATH')) {
    exit;
}

$smartcloud_flow_rating_summary_attributes = is_array($attributes ?? null) ? $attributes : [];
$smartcloud_flow_rating_summary_context = isset($block) && is_object($block) && isset($block->context) && is_array($block->context)
    ? $block->context
    : [];
$smartcloud_flow_rating_summary_post_id = !empty($smartcloud_flow_rating_summary_context['postId'])
    ? intval($smartcloud_flow_rating_summary_context['postId'])
    : intval(get_the_ID());
$smartcloud_flow_rating_summary_post_type = !empty($smartcloud_flow_rating_summary_context['postType'])
    ? sanitize_key($smartcloud_flow_rating_summary_context['postType'])
    : sanitize_key((string) get_post_type($smartcloud_flow_rating_summary_post_id));
$smartcloud_flow_rating_summary_source = (string) ($smartcloud_flow_rating_summary_attributes['contentTargetSource'] ?? 'wordpress-context');

if (
    empty($smartcloud_flow_rating_summary_attributes['formId'])
    && $smartcloud_flow_rating_summary_post_id
    && class_exists('\SmartCloud\WPSuite\Flow\FormSyncMeta')
) {
    $smartcloud_flow_rating_summary_backend_form_id = \SmartCloud\WPSuite\Flow\FormSyncMeta::getFormId($smartcloud_flow_rating_summary_post_id);
    if ($smartcloud_flow_rating_summary_backend_form_id) {
        $smartcloud_flow_rating_summary_attributes['formId'] = $smartcloud_flow_rating_summary_backend_form_id;
    }
}

if ($smartcloud_flow_rating_summary_source === 'wordpress-context' && $smartcloud_flow_rating_summary_post_id && $smartcloud_flow_rating_summary_post_type !== '') {
    $smartcloud_flow_rating_summary_attributes['contentRef'] = [
        'namespace' => 'wordpress',
        'type' => $smartcloud_flow_rating_summary_post_type,
        'id' => (string) $smartcloud_flow_rating_summary_post_id,
    ];
} elseif ($smartcloud_flow_rating_summary_source === 'explicit') {
    $smartcloud_flow_rating_summary_namespace = trim((string) ($smartcloud_flow_rating_summary_attributes['targetNamespace'] ?? ''));
    $smartcloud_flow_rating_summary_type = trim((string) ($smartcloud_flow_rating_summary_attributes['targetType'] ?? ''));
    $smartcloud_flow_rating_summary_id = trim((string) ($smartcloud_flow_rating_summary_attributes['targetId'] ?? ''));
    if ($smartcloud_flow_rating_summary_namespace !== '' && $smartcloud_flow_rating_summary_type !== '' && $smartcloud_flow_rating_summary_id !== '') {
        $smartcloud_flow_rating_summary_attributes['contentRef'] = [
            'namespace' => $smartcloud_flow_rating_summary_namespace,
            'type' => $smartcloud_flow_rating_summary_type,
            'id' => $smartcloud_flow_rating_summary_id,
        ];
    }
}

$smartcloud_flow_rating_summary_hash = substr(md5(serialize($smartcloud_flow_rating_summary_attributes)), 0, 8) . '_' . wp_rand();
$smartcloud_flow_rating_summary_dom_id = 'smartcloud-flow-rating-summary-' . $smartcloud_flow_rating_summary_hash;
$smartcloud_flow_rating_summary_config = base64_encode(wp_json_encode($smartcloud_flow_rating_summary_attributes));
?>
<div
    id="<?php echo esc_attr($smartcloud_flow_rating_summary_dom_id); ?>"
    data-config="<?php echo esc_attr($smartcloud_flow_rating_summary_config); ?>"
    <?php echo wp_kses_data(get_block_wrapper_attributes(['class' => 'smartcloud-flow-rating-summary'])); ?>
>
    <div class="smartcloud-flow-rating-summary__fallback" data-wpsuite-react-fallback><?php echo esc_html((string) ($smartcloud_flow_rating_summary_attributes['loadingMessage'] ?? '')); ?></div>
    <div class="smartcloud-flow-rating-summary__mount"></div>
</div>
