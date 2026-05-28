<?php
if (!defined('ABSPATH')) {
    exit;
}

$smartcloud_flow_attributes = is_array($attributes ?? null) ? $attributes : [];

$smartcloud_flow_modal_id = sanitize_title((string) ($smartcloud_flow_attributes['modalId'] ?? ''));
if ($smartcloud_flow_modal_id === '') {
    $smartcloud_flow_modal_id = 'flow-modal';
}

$smartcloud_flow_validate_action_name = static function ($value): string {
    $normalized = trim((string) $value);

    if ($normalized === '') {
        return '';
    }

    return preg_match('/^[a-zA-Z][a-zA-Z0-9_.:-]{0,80}$/', $normalized) ? $normalized : '';
};

$smartcloud_flow_hash_value = ltrim(trim((string) ($smartcloud_flow_attributes['hashValue'] ?? '')), '#');
$smartcloud_flow_prevent_background_scroll = !isset($smartcloud_flow_attributes['preventBackgroundScroll']) || (bool) $smartcloud_flow_attributes['preventBackgroundScroll'];

$smartcloud_flow_options = [
    'openOnHash' => !isset($smartcloud_flow_attributes['openOnHash']) || (bool) $smartcloud_flow_attributes['openOnHash'],
    'hashValue' => $smartcloud_flow_hash_value,
    'closeOnEsc' => !isset($smartcloud_flow_attributes['closeOnEsc']) || (bool) $smartcloud_flow_attributes['closeOnEsc'],
    'closeOnBackdrop' => !isset($smartcloud_flow_attributes['closeOnBackdrop']) || (bool) $smartcloud_flow_attributes['closeOnBackdrop'],
    'closeOnCancel' => !isset($smartcloud_flow_attributes['closeOnCancel']) || (bool) $smartcloud_flow_attributes['closeOnCancel'],
    'closeOnOk' => !isset($smartcloud_flow_attributes['closeOnOk']) || (bool) $smartcloud_flow_attributes['closeOnOk'],
    'closeOnFlowSubmitSuccess' => !empty($smartcloud_flow_attributes['closeOnFlowSubmitSuccess']),
    'restoreFocusOnClose' => !isset($smartcloud_flow_attributes['restoreFocusOnClose']) || (bool) $smartcloud_flow_attributes['restoreFocusOnClose'],
    'preventBackgroundScroll' => $smartcloud_flow_prevent_background_scroll,
    'dispatchLifecycleEvents' => !isset($smartcloud_flow_attributes['dispatchLifecycleEvents']) || (bool) $smartcloud_flow_attributes['dispatchLifecycleEvents'],
    'defaultPrimaryAction' => $smartcloud_flow_validate_action_name($smartcloud_flow_attributes['defaultPrimaryAction'] ?? ($smartcloud_flow_attributes['defaultOkAction'] ?? '')),
    'defaultSecondaryAction' => $smartcloud_flow_validate_action_name($smartcloud_flow_attributes['defaultSecondaryAction'] ?? ($smartcloud_flow_attributes['defaultCancelAction'] ?? '')),
    'defaultDismissAction' => $smartcloud_flow_validate_action_name($smartcloud_flow_attributes['defaultDismissAction'] ?? ''),
    'busyText' => trim((string) ($smartcloud_flow_attributes['busyText'] ?? '')),
    'errorText' => trim((string) ($smartcloud_flow_attributes['errorText'] ?? '')),
];

$smartcloud_flow_classes = [
    'wps-flow-modal',
    'is-size-' . sanitize_html_class((string) ($smartcloud_flow_attributes['size'] ?? 'md')),
    'is-position-' . sanitize_html_class((string) ($smartcloud_flow_attributes['position'] ?? 'center')),
    'is-mobile-' . sanitize_html_class((string) ($smartcloud_flow_attributes['mobileBehavior'] ?? 'normal')),
    'is-backdrop-' . sanitize_html_class((string) ($smartcloud_flow_attributes['backdropStyle'] ?? 'default')),
    'has-animation-' . sanitize_html_class((string) ($smartcloud_flow_attributes['animation'] ?? 'fade')),
];

$smartcloud_flow_style_map = [
    '--wps-flow-modal-width' => trim((string) ($smartcloud_flow_attributes['width'] ?? '')),
    '--wps-flow-modal-max-width' => trim((string) ($smartcloud_flow_attributes['maxWidth'] ?? '')),
    '--wps-flow-modal-height' => trim((string) ($smartcloud_flow_attributes['height'] ?? '')),
    '--wps-flow-modal-max-height' => trim((string) ($smartcloud_flow_attributes['maxHeight'] ?? '')),
    '--wps-flow-modal-panel-padding' => trim((string) ($smartcloud_flow_attributes['panelPadding'] ?? '')),
    '--wps-flow-modal-panel-radius' => trim((string) ($smartcloud_flow_attributes['panelRadius'] ?? '')),
    '--wps-flow-modal-panel-shadow' => trim((string) ($smartcloud_flow_attributes['panelShadow'] ?? '')),
];

$smartcloud_flow_inline_styles = [];
foreach ($smartcloud_flow_style_map as $smartcloud_flow_property => $smartcloud_flow_value) {
    if ($smartcloud_flow_value === '') {
        continue;
    }

    $smartcloud_flow_inline_styles[] = $smartcloud_flow_property . ':' . $smartcloud_flow_value;
}

$smartcloud_flow_wrapper_attributes = get_block_wrapper_attributes([
    'class' => implode(' ', $smartcloud_flow_classes),
    'style' => implode(';', $smartcloud_flow_inline_styles),
]);

$smartcloud_flow_aria_label = trim((string) ($smartcloud_flow_attributes['ariaLabel'] ?? ''));
$smartcloud_flow_labelled_by = trim((string) ($smartcloud_flow_attributes['labelledById'] ?? ''));
$smartcloud_flow_has_close_button = !isset($smartcloud_flow_attributes['showCloseButton']) || $smartcloud_flow_attributes['showCloseButton'];
$smartcloud_flow_close_button_label = trim((string) ($smartcloud_flow_attributes['closeButtonLabel'] ?? ''));
if ($smartcloud_flow_close_button_label === '') {
    $smartcloud_flow_close_button_label = __('Close dialog', 'smartcloud-flow');
}

$smartcloud_flow_panel_class = 'wps-flow-modal__panel';
if ($smartcloud_flow_has_close_button) {
    $smartcloud_flow_panel_class .= ' wps-flow-modal__panel--has-close-button';
}
?>
<dialog <?php echo wp_kses_data($smartcloud_flow_wrapper_attributes); ?>
    data-wps-flow-modal-id="<?php echo esc_attr($smartcloud_flow_modal_id); ?>"
    data-wps-flow-modal-options="<?php echo esc_attr(wp_json_encode($smartcloud_flow_options)); ?>" <?php if ($smartcloud_flow_labelled_by !== ''): ?> aria-labelledby="<?php echo esc_attr($smartcloud_flow_labelled_by); ?>"
    <?php else: ?>
        aria-label="<?php echo esc_attr($smartcloud_flow_aria_label !== '' ? $smartcloud_flow_aria_label : __('Flow modal dialog', 'smartcloud-flow')); ?>"
    <?php endif; ?>>
    <div class="<?php echo esc_attr($smartcloud_flow_panel_class); ?>" tabindex="-1">
        <?php if ($smartcloud_flow_has_close_button): ?>
            <button class="wps-flow-modal__close wps-flow-modal-close wps-flow-modal-role--dismiss" type="button"
                data-wps-flow-modal-close data-wps-flow-modal-role="dismiss"
                aria-label="<?php echo esc_attr($smartcloud_flow_close_button_label); ?>">
                <span aria-hidden="true">×</span>
            </button>
        <?php endif; ?>
        <div class="wps-flow-modal__content">
            <?php echo $content; ?>
        </div>
    </div>
</dialog>