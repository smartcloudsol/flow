<?php
if (!defined('ABSPATH')) {
    exit;
}

$smartcloud_flow_discussion_attributes = is_array($attributes ?? null) ? $attributes : [];
$smartcloud_flow_discussion_context = isset($block) && is_object($block) && isset($block->context) && is_array($block->context)
    ? $block->context
    : [];
$smartcloud_flow_discussion_post_id = !empty($smartcloud_flow_discussion_context['postId'])
    ? intval($smartcloud_flow_discussion_context['postId'])
    : intval(get_the_ID());
$smartcloud_flow_discussion_post_type = !empty($smartcloud_flow_discussion_context['postType'])
    ? sanitize_key($smartcloud_flow_discussion_context['postType'])
    : sanitize_key((string) get_post_type($smartcloud_flow_discussion_post_id));
$smartcloud_flow_discussion_source = (string) ($smartcloud_flow_discussion_attributes['contentTargetSource'] ?? 'wordpress-context');

// A discussion rendered beside its source form shares the form definition
// synchronized for the current post. Keep an explicitly authored formId, but
// fill an empty one from the same post meta that the form renderer uses.
if (
    empty($smartcloud_flow_discussion_attributes['formId'])
    && $smartcloud_flow_discussion_post_id
    && class_exists('\SmartCloud\WPSuite\Flow\FormSyncMeta')
) {
    $smartcloud_flow_discussion_backend_form_id = \SmartCloud\WPSuite\Flow\FormSyncMeta::getFormId($smartcloud_flow_discussion_post_id);
    if ($smartcloud_flow_discussion_backend_form_id) {
        $smartcloud_flow_discussion_attributes['formId'] = $smartcloud_flow_discussion_backend_form_id;
    }
}

if ($smartcloud_flow_discussion_source === 'wordpress-context' && $smartcloud_flow_discussion_post_id && $smartcloud_flow_discussion_post_type !== '') {
    $smartcloud_flow_discussion_attributes['contentRef'] = [
        'namespace' => 'wordpress',
        'type' => $smartcloud_flow_discussion_post_type,
        'id' => (string) $smartcloud_flow_discussion_post_id,
    ];
} elseif ($smartcloud_flow_discussion_source === 'explicit') {
    $smartcloud_flow_discussion_namespace = trim((string) ($smartcloud_flow_discussion_attributes['targetNamespace'] ?? ''));
    $smartcloud_flow_discussion_type = trim((string) ($smartcloud_flow_discussion_attributes['targetType'] ?? ''));
    $smartcloud_flow_discussion_id = trim((string) ($smartcloud_flow_discussion_attributes['targetId'] ?? ''));
    if ($smartcloud_flow_discussion_namespace !== '' && $smartcloud_flow_discussion_type !== '' && $smartcloud_flow_discussion_id !== '') {
        $smartcloud_flow_discussion_attributes['contentRef'] = [
            'namespace' => $smartcloud_flow_discussion_namespace,
            'type' => $smartcloud_flow_discussion_type,
            'id' => $smartcloud_flow_discussion_id,
        ];
    }
}

$smartcloud_flow_discussion_hash = substr(md5(serialize($smartcloud_flow_discussion_attributes)), 0, 8) . '_' . wp_rand();
$smartcloud_flow_discussion_dom_id = 'smartcloud-flow-discussion-' . $smartcloud_flow_discussion_hash;
$smartcloud_flow_discussion_config = base64_encode(wp_json_encode($smartcloud_flow_discussion_attributes));
?>
<div
    id="<?php echo esc_attr($smartcloud_flow_discussion_dom_id); ?>"
    data-config="<?php echo esc_attr($smartcloud_flow_discussion_config); ?>"
    <?php echo wp_kses_data(get_block_wrapper_attributes(['class' => 'smartcloud-flow-discussion'])); ?>
>
    <div class="smartcloud-flow-discussion__fallback" data-wpsuite-react-fallback><?php echo esc_html((string) ($smartcloud_flow_discussion_attributes['loadingMessage'] ?? '')); ?></div>
    <div class="smartcloud-flow-discussion__mount"></div>
</div>
