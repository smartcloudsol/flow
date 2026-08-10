<?php
/**
 * SmartCloud Flow native WordPress Abilities API provider.
 *
 * @package smartcloud-flow
 */

namespace SmartCloud\WPSuite\Flow\Abilities;

use SmartCloud\WPSuite\Hub\Abilities\Product_Provider_Base;
use WP_Error;

if (!defined('ABSPATH')) {
    exit;
}

final class Provider extends Product_Provider_Base
{
    private const REACT_FALLBACK_BLOCK = 'wpsuite/react-fallback';

    /** @var string[] */
    private array $components = array('form', 'discussion', 'content-root', 'success-state', 'modal-gallery');

    /** @var string[] */
    private array $root_blocks = array('smartcloud-flow/form', 'smartcloud-flow/discussion', 'smartcloud-flow/content-root', 'smartcloud-flow/modal');

    /** @var string[] */
    private array $modal_gallery_blocks = array('smartcloud-flow/modal', 'smartcloud-flow/gallery');

    /** @var array<string,string> */
    private array $field_type_blocks = array(
        'text' => 'smartcloud-flow/text-field',
        'textarea' => 'smartcloud-flow/textarea-field',
        'select' => 'smartcloud-flow/select-field',
        'checkbox' => 'smartcloud-flow/checkbox-field',
        'checkbox-group' => 'smartcloud-flow/checkbox-group-field',
        'date' => 'smartcloud-flow/date-field',
        'switch' => 'smartcloud-flow/switch-field',
        'number' => 'smartcloud-flow/number-field',
        'radio' => 'smartcloud-flow/radio-field',
        'password' => 'smartcloud-flow/password-field',
        'pin' => 'smartcloud-flow/pin-field',
        'color' => 'smartcloud-flow/color-field',
        'file' => 'smartcloud-flow/file-field',
        'slider' => 'smartcloud-flow/slider-field',
        'range-slider' => 'smartcloud-flow/range-slider-field',
        'tags' => 'smartcloud-flow/tags-field',
        'rating' => 'smartcloud-flow/rating-field',
        'hidden' => 'smartcloud-flow/hidden-field',
        'submit' => 'smartcloud-flow/submit-button',
        'save-draft' => 'smartcloud-flow/save-draft-button',
        'wizard' => 'smartcloud-flow/wizard',
        'wizard-step' => 'smartcloud-flow/wizard-step',
        'fieldset' => 'smartcloud-flow/fieldset',
        'collapse' => 'smartcloud-flow/collapse',
        'group' => 'smartcloud-flow/group-field',
        'grid' => 'smartcloud-flow/grid-field',
        'stack' => 'smartcloud-flow/stack-field',
    );

    /** @var string[] */
    private array $label_blocks = array(
        'smartcloud-flow/text-field',
        'smartcloud-flow/textarea-field',
        'smartcloud-flow/select-field',
        'smartcloud-flow/checkbox-field',
        'smartcloud-flow/checkbox-group-field',
        'smartcloud-flow/date-field',
        'smartcloud-flow/switch-field',
        'smartcloud-flow/number-field',
        'smartcloud-flow/radio-field',
        'smartcloud-flow/password-field',
        'smartcloud-flow/pin-field',
        'smartcloud-flow/color-field',
        'smartcloud-flow/file-field',
        'smartcloud-flow/slider-field',
        'smartcloud-flow/range-slider-field',
        'smartcloud-flow/tags-field',
        'smartcloud-flow/rating-field',
    );

    /** @var string[] */
    private array $content_blocks = array(
        'smartcloud-flow/display-title',
        'smartcloud-flow/display-blockquote',
        'smartcloud-flow/display-mark',
        'smartcloud-flow/display-badge',
        'smartcloud-flow/display-highlight',
        'smartcloud-flow/display-code',
        'smartcloud-flow/display-number-formatter',
        'smartcloud-flow/display-spoiler',
        'smartcloud-flow/display-image',
        'smartcloud-flow/display-text',
        'smartcloud-flow/list',
        'smartcloud-flow/list-item',
        'smartcloud-flow/table',
        'smartcloud-flow/table-tr',
        'smartcloud-flow/table-th',
        'smartcloud-flow/table-td',
        'smartcloud-flow/timeline',
        'smartcloud-flow/timeline-item',
        'smartcloud-flow/overflow-list',
        'smartcloud-flow/overflow-list-item',
        'smartcloud-flow/divider',
        'smartcloud-flow/visually-hidden',
        'smartcloud-flow/stack-field',
        'smartcloud-flow/group-field',
        'smartcloud-flow/grid-field',
        'smartcloud-flow/fieldset',
        'smartcloud-flow/collapse',
    );

    private string $plugin_path;

    public function __construct()
    {
        $this->plugin_path = defined('SMARTCLOUD_FLOW_PATH') ? SMARTCLOUD_FLOW_PATH : dirname(__DIR__) . '/';

        parent::__construct(
            'smartcloud-flow',
            'SmartCloud Flow',
            'smartcloud-flow',
            'smartcloud-flow',
            '1.1.0',
            defined('SMARTCLOUD_FLOW_VERSION') ? SMARTCLOUD_FLOW_VERSION : '',
            'smartcloud-flow',
            array('smartcloud-flow/')
        );
    }

    protected function extra_abilities(): array
    {
        return array(
            array(
                'suffix' => 'get-backend-status',
                'description' => 'Return safe SmartCloud Flow backend and editor synchronization status.',
                'method' => 'get_backend_status',
                'input_schema' => $this->post_id_input_schema(),
            ),
        );
    }

    public function get_runtime_capabilities(array $input = array()): array
    {
        $block_names = array_merge($this->all_owned_blocks(), array('core/group', 'core/image'));
        $block_status = $this->block_registration_status($block_names);
        $missing = array();
        foreach (array('smartcloud-flow/form', 'smartcloud-flow/discussion', 'smartcloud-flow/content-root', 'smartcloud-flow/success-state') as $required) {
            if (empty($block_status[$required])) {
                $missing[] = 'block-not-registered:' . $required;
            }
        }
        $backend = $this->backend_status_array(0);
        $modal_gallery_missing = $this->missing_registered_blocks(
            array('smartcloud-flow/modal', 'smartcloud-flow/gallery', 'core/group', 'core/image'),
            $block_status
        );

        return array(
            'provider' => $this->provider_id,
            'provider_version' => $this->plugin_version,
            'contract_version' => $this->contract_version,
            'components' => $this->components,
            'block_registration' => $block_status,
            'backend_status' => $backend,
            'component_readiness' => array(
                'form' => array(
                    'runtime_ready' => empty($missing) && !empty($backend['backend_sync_enabled']),
                    'missing_requirements' => $missing,
                ),
                'content-root' => array(
                    'runtime_ready' => empty($missing),
                    'missing_requirements' => $missing,
                ),
                'discussion' => array(
                    'runtime_ready' => !empty($block_status['smartcloud-flow/discussion']) && !empty($backend['backend_sync_enabled']),
                    'missing_requirements' => !empty($block_status['smartcloud-flow/discussion'])
                        ? array()
                        : array('block-not-registered:smartcloud-flow/discussion'),
                ),
                'success-state' => array(
                    'runtime_ready' => !empty($block_status['smartcloud-flow/success-state']),
                    'missing_requirements' => !empty($block_status['smartcloud-flow/success-state'])
                        ? array()
                        : array('block-not-registered:smartcloud-flow/success-state'),
                ),
                'modal-gallery' => array(
                    'runtime_ready' => empty($modal_gallery_missing),
                    'missing_requirements' => $modal_gallery_missing,
                ),
            ),
            'runtime_ready' => empty($missing) && !empty($backend['backend_sync_enabled']),
            'missing_requirements' => $missing,
            'warnings' => array(),
        );
    }

    public function list_components(array $input = array()): array
    {
        return array(
            'provider' => $this->provider_id,
            'contract_version' => $this->contract_version,
            'components' => array(
                array('id' => 'form', 'label' => 'Flow form', 'block_names' => array('smartcloud-flow/form'), 'materializable' => true),
                array('id' => 'discussion', 'label' => 'Flow discussion', 'block_names' => array('smartcloud-flow/discussion'), 'materializable' => true),
                array('id' => 'content-root', 'label' => 'Flow content root', 'block_names' => array('smartcloud-flow/content-root'), 'materializable' => true),
                array('id' => 'success-state', 'label' => 'Flow success state', 'block_names' => array('smartcloud-flow/success-state'), 'materializable' => true),
                array(
                    'id' => 'modal-gallery',
                    'label' => 'Flow modal gallery',
                    'block_names' => array('smartcloud-flow/modal', 'core/group', 'smartcloud-flow/gallery', 'core/image'),
                    'required_registered_block_types' => array('smartcloud-flow/modal', 'core/group', 'smartcloud-flow/gallery', 'core/image'),
                    'materializable' => true,
                ),
            ),
        );
    }

    public function get_component_schema(array $input): array|WP_Error
    {
        $component = sanitize_key((string) ($input['component'] ?? ''));
        if (!in_array($component, $this->components, true)) {
            return new WP_Error('smartcloud_flow_component_not_available', __('Unknown Flow component.', 'smartcloud-flow'));
        }

        if ($component === 'modal-gallery') {
            return $this->modal_gallery_component_schema();
        }

        $block_names = match ($component) {
            'form' => array_merge(array('smartcloud-flow/form'), array_values($this->field_type_blocks), array('smartcloud-flow/success-state', 'smartcloud-flow/submission-meta')),
            'discussion' => array('smartcloud-flow/discussion'),
            'content-root' => array_merge(array('smartcloud-flow/content-root'), $this->content_blocks),
            default => array('smartcloud-flow/success-state', 'smartcloud-flow/submission-meta'),
        };

        $attrs = array();
        foreach (array_values(array_unique($block_names)) as $block_name) {
            $attrs[$block_name] = $this->block_attributes($this->plugin_path, $block_name);
        }

        return array(
            'provider' => $this->provider_id,
            'contract_version' => $this->contract_version,
            'component' => $component,
            'semantic_schema' => array('type' => 'object', 'additionalProperties' => true),
            'block_contract' => array(
                'block_names' => array_values(array_unique($block_names)),
                'attributes' => $attrs,
                'sync_mode' => 'editor-resave-required',
            ),
        );
    }

    public function materialize_component(array $input): array|WP_Error
    {
        $component = sanitize_key((string) ($input['component'] ?? ''));
        if (!in_array($component, $this->components, true)) {
            return new WP_Error('smartcloud_flow_component_not_available', __('Unknown Flow component.', 'smartcloud-flow'));
        }

        $spec = is_array($input['spec'] ?? null) ? $input['spec'] : array();
        $blocks = match ($component) {
            'form' => $this->materialize_form($spec),
            'discussion' => $this->materialize_discussion($spec),
            'content-root' => $this->materialize_content_root($spec),
            'modal-gallery' => $this->materialize_modal_gallery($spec),
            default => $this->materialize_success_state($spec),
        };
        if (is_wp_error($blocks)) {
            return $blocks;
        }

        $runtime = $this->get_runtime_capabilities();
        $component_runtime = is_array($runtime['component_readiness'][$component] ?? null)
            ? $runtime['component_readiness'][$component]
            : array(
                'runtime_ready' => (bool) $runtime['runtime_ready'],
                'missing_requirements' => $runtime['missing_requirements'],
            );
        $result = $this->materialization_result(
            $component,
            $blocks,
            (bool) ($component_runtime['runtime_ready'] ?? false),
            is_array($component_runtime['missing_requirements'] ?? null) ? $component_runtime['missing_requirements'] : array(),
            $runtime['warnings']
        );
        if ($component === 'form') {
            $result['sync_requirement'] = $this->editor_sync_requirement(true);
        }
        if ($component === 'modal-gallery') {
            $modal_attrs = is_array($blocks[0]['attrs'] ?? null) ? $blocks[0]['attrs'] : array();
            $gallery_attrs = is_array($blocks[0]['innerBlocks'][0]['innerBlocks'][0]['attrs'] ?? null)
                ? $blocks[0]['innerBlocks'][0]['innerBlocks'][0]['attrs']
                : array();
            $result['trigger_contract'] = array(
                'modal_class' => 'wps-flow-modal-open--' . (string) ($modal_attrs['modalId'] ?? ''),
                'gallery_class' => 'wps-flow-gallery-target--' . (string) ($gallery_attrs['galleryId'] ?? ''),
                'index_class_template' => 'wps-flow-gallery-index--{one_based_index}',
            );
        }

        return $result;
    }

    public function validate_block_tree(array $input): array
    {
        $blocks = is_array($input['blocks'] ?? null) ? $input['blocks'] : array();
        $errors = array();
        $fields = array();
        $this->validate_nodes($blocks, '', null, null, false, $errors, $fields);

        return $this->validation_result($blocks, $errors);
    }

    public function get_backend_status(array $input = array()): array
    {
        return array(
            'provider' => $this->provider_id,
            'contract_version' => $this->contract_version,
            'backend_status' => $this->backend_status_array(absint($input['post_id'] ?? 0)),
        );
    }

    private function materialize_form(array $spec): array|WP_Error
    {
        $attrs = $this->filter_attrs($this->plugin_path, 'smartcloud-flow/form', $spec);
        $children = array();

        foreach (($spec['fields'] ?? $this->default_fields()) as $field) {
            if (!is_array($field)) {
                return new WP_Error('smartcloud_flow_invalid_form_spec', __('Each Flow field must be an object.', 'smartcloud-flow'));
            }
            $block = $this->field_block($field);
            if (is_wp_error($block)) {
                return $block;
            }
            $children[] = $block;
        }

        foreach (($spec['success_states'] ?? array()) as $state) {
            if (is_array($state)) {
                $children[] = $this->materialize_success_state($state)[0];
            }
        }

        return array($this->transparent_block('smartcloud-flow/form', $attrs, $children));
    }

    private function materialize_content_root(array $spec): array
    {
        $attrs = $this->filter_attrs($this->plugin_path, 'smartcloud-flow/content-root', $spec);
        $children = array();
        foreach (($spec['blocks'] ?? array()) as $child) {
            if (is_array($child) && in_array((string) ($child['blockName'] ?? ''), $this->content_blocks, true)) {
                $children[] = $child;
            }
        }

        return array($this->transparent_block('smartcloud-flow/content-root', $attrs, $children));
    }

    private function materialize_discussion(array $spec): array|WP_Error
    {
        $attrs = $this->filter_attrs($this->plugin_path, 'smartcloud-flow/discussion', $spec);
        foreach (array('title', 'emptyMessage', 'loadingMessage', 'errorMessage', 'retryLabel', 'anonymousAuthorLabel', 'tombstoneLabel', 'replyLabel', 'cancelReplyLabel', 'loadMoreLabel', 'loadRepliesLabel', 'depthLimitLabel') as $required_label) {
            if (!isset($attrs[$required_label]) || trim((string) $attrs[$required_label]) === '') {
                return new WP_Error(
                    'smartcloud_flow_discussion_label_required',
                    sprintf(__('Discussion attribute %s must contain authored visible text.', 'smartcloud-flow'), $required_label)
                );
            }
        }
        return array($this->transparent_block('smartcloud-flow/discussion', $attrs, array()));
    }

    private function materialize_success_state(array $spec): array
    {
        $attrs = $this->filter_attrs($this->plugin_path, 'smartcloud-flow/success-state', $spec);
        $attrs['trigger'] = (string) ($attrs['trigger'] ?? 'submit-success');
        $children = array();
        foreach (($spec['submission_meta_fields'] ?? array('submissionId')) as $field) {
            $children[] = $this->submission_meta_block(array('field' => (string) $field));
        }

        $prefix = '<div class="wp-block-smartcloud-flow-success-state" data-smartcloud-flow-form-state="success" data-smartcloud-flow-form-state-trigger="' . esc_attr($attrs['trigger']) . '">';
        $inner_content = array($prefix);
        foreach ($children as $_child) {
            $inner_content[] = null;
        }
        $inner_content[] = '</div>';

        return array($this->block('smartcloud-flow/success-state', $attrs, $children, $prefix . '</div>', $inner_content));
    }

    private function modal_gallery_component_schema(): array
    {
        return array(
            'provider' => $this->provider_id,
            'contract_version' => $this->contract_version,
            'component' => 'modal-gallery',
            'semantic_schema' => array(
                'type' => 'object',
                'required' => array('modal', 'gallery', 'images'),
                'properties' => array(
                    'modal' => array(
                        'type' => 'object',
                        'required' => array('modalId'),
                        'properties' => array(
                            'modalId' => array('type' => 'string', 'minLength' => 1, 'maxLength' => 80),
                        ),
                        'additionalProperties' => true,
                    ),
                    'gallery' => array(
                        'type' => 'object',
                        'required' => array('galleryId'),
                        'properties' => array(
                            'galleryId' => array('type' => 'string', 'minLength' => 1, 'maxLength' => 80),
                            'startIndex' => array('type' => 'integer', 'minimum' => 1),
                        ),
                        'additionalProperties' => true,
                    ),
                    'images' => array(
                        'type' => 'array',
                        'minItems' => 1,
                        'maxItems' => 100,
                        'items' => array(
                            'type' => 'object',
							'description' => 'Canonical core/image block returned by the Composer media materializer.',
                            'additionalProperties' => true,
                        ),
                    ),
                ),
                'additionalProperties' => false,
            ),
            'block_contract' => array(
                'block_names' => array('smartcloud-flow/modal', 'core/group', 'smartcloud-flow/gallery', 'core/image'),
                'attributes' => array(
                    'smartcloud-flow/modal' => $this->block_attributes($this->plugin_path, 'smartcloud-flow/modal'),
                    'core/group' => array(),
                    'smartcloud-flow/gallery' => $this->block_attributes($this->plugin_path, 'smartcloud-flow/gallery'),
                    'core/image' => array(),
                ),
                'allowed_inner_blocks' => array(
                    'smartcloud-flow/modal' => array('core/group'),
                    'core/group' => array('smartcloud-flow/gallery'),
                    'smartcloud-flow/gallery' => array('core/image'),
                ),
                'sync_mode' => 'none',
                'trigger_classes' => array(
                    'wps-flow-modal-open--{modalId}',
                    'wps-flow-gallery-target--{galleryId}',
                    'wps-flow-gallery-index--{one_based_index}',
                ),
            ),
        );
    }

    private function materialize_modal_gallery(array $spec): array|WP_Error
    {
        $modal_spec = is_array($spec['modal'] ?? null) ? $spec['modal'] : array();
        $gallery_spec = is_array($spec['gallery'] ?? null) ? $spec['gallery'] : array();
        $images = $this->normalize_gallery_images($spec['images'] ?? array());
        if (is_wp_error($images)) {
            return $images;
        }

        $modal_attrs = array_replace(
            $this->block_defaults($this->plugin_path, 'smartcloud-flow/modal'),
            array(
                'openOnHash' => false,
                'size' => 'wide',
                'mobileBehavior' => 'fullscreen',
                'backdropStyle' => 'blurred',
                'allowBodyFullscreen' => true,
            ),
            $this->filter_attrs($this->plugin_path, 'smartcloud-flow/modal', $modal_spec)
        );
        $gallery_attrs = array_replace(
            $this->block_defaults($this->plugin_path, 'smartcloud-flow/gallery'),
            $this->filter_attrs($this->plugin_path, 'smartcloud-flow/gallery', $gallery_spec)
        );

        $modal_attrs['modalId'] = sanitize_title((string) ($modal_attrs['modalId'] ?? ''));
        $gallery_attrs['galleryId'] = sanitize_title((string) ($gallery_attrs['galleryId'] ?? ''));
        if ($modal_attrs['modalId'] === '') {
            return new WP_Error('smartcloud_flow_modal_id_missing', __('A modal gallery requires a non-empty modalId.', 'smartcloud-flow'));
        }
        if ($gallery_attrs['galleryId'] === '') {
            return new WP_Error('smartcloud_flow_gallery_id_missing', __('A modal gallery requires a non-empty galleryId.', 'smartcloud-flow'));
        }

        if (trim((string) ($modal_attrs['ariaLabel'] ?? '')) === '') {
            $modal_attrs['ariaLabel'] = __('Image gallery', 'smartcloud-flow');
        }

        $gallery_attrs['startIndex'] = max(1, min(count($images), absint($gallery_attrs['startIndex'] ?? 1)));
        $gallery_prefix = sprintf(
            '<div class="wp-block-smartcloud-flow-gallery wps-flow-gallery" data-wps-flow-gallery="true" data-wps-flow-gallery-id="%s" data-wps-flow-gallery-start-index="%d" data-wps-flow-gallery-loop="%s" data-wps-flow-gallery-show-counter="%s" data-wps-flow-gallery-show-thumbnails="%s" data-wps-flow-gallery-show-captions="%s">',
            esc_attr($gallery_attrs['galleryId']),
            (int) $gallery_attrs['startIndex'],
            !empty($gallery_attrs['loop']) ? 'true' : 'false',
            !empty($gallery_attrs['showCounter']) ? 'true' : 'false',
            !empty($gallery_attrs['showThumbnails']) ? 'true' : 'false',
            !empty($gallery_attrs['showCaptions']) ? 'true' : 'false'
        );
        $gallery_inner_content = array($gallery_prefix);
        foreach ($images as $_image) {
            $gallery_inner_content[] = null;
        }
        $gallery_inner_content[] = '</div>';

        $gallery = $this->block(
            'smartcloud-flow/gallery',
            $gallery_attrs,
            $images,
            $gallery_prefix . '</div>',
            $gallery_inner_content
        );

        $body_prefix = '<div class="wp-block-group wps-flow-modal-slot wps-flow-modal-slot--body">';
        $body_slot = $this->block(
            'core/group',
            array(
                'className' => 'wps-flow-modal-slot wps-flow-modal-slot--body',
                'layout' => array('type' => 'constrained'),
            ),
            array($gallery),
            $body_prefix . '</div>',
            array($body_prefix, null, '</div>')
        );

        return array($this->transparent_block('smartcloud-flow/modal', $modal_attrs, array($body_slot)));
    }

    private function normalize_gallery_images(mixed $images): array|WP_Error
    {
        if (!is_array($images) || !array_is_list($images) || empty($images)) {
            return new WP_Error('smartcloud_flow_gallery_images_missing', __('A modal gallery requires at least one canonical core/image block.', 'smartcloud-flow'));
        }
        if (count($images) > 100) {
            return new WP_Error('smartcloud_flow_gallery_too_large', __('A modal gallery may contain at most 100 images.', 'smartcloud-flow'));
        }

        $normalized = array();
        foreach ($images as $index => $image) {
            if (!is_array($image) || (string) ($image['blockName'] ?? '') !== 'core/image') {
                return new WP_Error(
                    'smartcloud_flow_gallery_image_invalid',
                    sprintf(
                        /* translators: %d: One-based position of the gallery item. */
                        __('Gallery item %d must be a canonical core/image block.', 'smartcloud-flow'),
                        $index + 1
                    )
                );
            }

            $attrs = $image['attrs'] ?? $image['attributes'] ?? array();
            $children = $image['innerBlocks'] ?? array();
            $inner_html = $image['innerHTML'] ?? null;
            $inner_content = $image['innerContent'] ?? null;
            if (
                !is_array($attrs)
                || !is_array($children)
                || !empty($children)
                || !is_string($inner_html)
                || !is_array($inner_content)
                || count($inner_content) !== 1
                || !is_string($inner_content[0] ?? null)
                || $inner_content[0] !== $inner_html
                || !preg_match('/<figure\\b[^>]*\\bwp-block-image\\b/i', $inner_html)
                || !preg_match('/<img\\b/i', $inner_html)
                || preg_match("~<(?:script|iframe|object|embed|form)\\b|<[^>]+\\son[a-z]+\\s*=|(?:href|src)\\s*=\\s*[\"']?\\s*javascript\\s*:~i", $inner_html)
            ) {
                return new WP_Error(
                    'smartcloud_flow_gallery_image_invalid',
                    sprintf(
                        /* translators: %d: One-based position of the gallery item. */
                        __('Gallery item %d is not a safe canonical core/image leaf block.', 'smartcloud-flow'),
                        $index + 1
                    )
                );
            }

            $normalized[] = array(
                'blockName' => 'core/image',
                'attrs' => $attrs,
                'innerBlocks' => array(),
                'innerHTML' => $inner_html,
                'innerContent' => array($inner_html),
            );
        }

        return $normalized;
    }

    private function field_block(array $field): array|WP_Error
    {
        $type = sanitize_key((string) ($field['type'] ?? 'text'));
        if (!isset($this->field_type_blocks[$type])) {
            return new WP_Error('smartcloud_flow_unknown_field_type', __('Unknown Flow field type.', 'smartcloud-flow'));
        }
        $block_name = $this->field_type_blocks[$type];
        $attrs = $this->filter_attrs($this->plugin_path, $block_name, $field);
        $attrs = array_replace($this->block_defaults($this->plugin_path, $block_name), $attrs);
        $payload = $this->flow_payload($type, $attrs);
        $html = '<div class="wp-block-' . esc_attr(str_replace('/', '-', $block_name)) . '" data-smartcloud-flow-form-field="' . esc_attr($this->encode_flow_payload($payload)) . '">';
        if (in_array($block_name, $this->label_blocks, true)) {
            $html .= '<span hidden>' . esc_html((string) ($attrs['label'] ?? '')) . '</span>';
        }
        $html .= '</div>';

        return $this->block($block_name, $attrs, array(), $html, array($html));
    }

    private function submission_meta_block(array $attrs): array
    {
        $attrs = array_replace($this->block_defaults($this->plugin_path, 'smartcloud-flow/submission-meta'), $attrs);
        $html = sprintf(
            '<span class="wp-block-smartcloud-flow-submission-meta" data-smartcloud-flow-submission-meta="true" data-smartcloud-flow-submission-meta-field="%s" data-smartcloud-flow-submission-meta-label="%s" data-smartcloud-flow-submission-meta-fallback="%s" data-smartcloud-flow-submission-meta-copyable="%s" data-smartcloud-flow-submission-meta-date-format="%s"></span>',
            esc_attr((string) ($attrs['field'] ?? 'submissionId')),
            esc_attr((string) ($attrs['label'] ?? '')),
            esc_attr((string) ($attrs['fallbackText'] ?? '')),
            !empty($attrs['copyable']) ? 'true' : 'false',
            esc_attr((string) ($attrs['dateFormat'] ?? 'localized'))
        );

        return $this->block('smartcloud-flow/submission-meta', $attrs, array(), $html, array($html));
    }

    private function flow_payload(string $type, array $attrs): array
    {
        foreach (array('anchor', 'lock', 'className', 'style') as $key) {
            unset($attrs[$key]);
        }
        if (array_key_exists('hidden', $attrs) && $attrs['hidden'] === false) {
            unset($attrs['hidden']);
        }
        $conditional_logic = $attrs['conditionalLogic'] ?? null;
        if (
            is_array($conditional_logic)
            && ($conditional_logic['enabled'] ?? false) !== true
            && (!isset($conditional_logic['rules']) || !is_array($conditional_logic['rules']) || $conditional_logic['rules'] === array())
        ) {
            unset($attrs['conditionalLogic']);
        }
        if (in_array($type, array('select', 'radio', 'tags'), true)) {
            $options_text = (string) ($attrs['optionsText'] ?? '');
            unset($attrs['optionsText']);
            if (empty($attrs['optionsSource']) || $attrs['optionsSource'] === 'static') {
                $attrs['options'] = $this->parse_options($options_text);
            }
        }
        if ($type === 'checkbox-group') {
            $options_text = (string) ($attrs['optionsText'] ?? '');
            $exclusive = (string) ($attrs['exclusiveValuesText'] ?? '');
            unset($attrs['optionsText'], $attrs['exclusiveValuesText']);
            if (empty($attrs['optionsSource']) || $attrs['optionsSource'] === 'static') {
                $attrs['options'] = $this->parse_options($options_text);
            }
            $attrs['exclusiveValues'] = $this->parse_text_list($exclusive);
        }
        if ($type === 'pin') {
            $legacy_type = $attrs['type'] ?? null;
            $attrs['inputType'] = $attrs['inputType'] ?? $legacy_type;
        }

        return array_merge(array('type' => $type === 'range-slider' ? 'rangeslider' : $type), $attrs);
    }

    private function encode_flow_payload(array $payload): string
    {
        $json = wp_json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if (!is_string($json)) {
            return '';
        }
        $uri_component = str_replace(array('%21', '%27', '%28', '%29', '%2A'), array('!', "'", '(', ')', '*'), rawurlencode($json));

        return base64_encode($uri_component);
    }

    private function parse_options(string $value): array
    {
        $result = array();
        foreach (preg_split('/\r?\n/', $value) ?: array() as $line) {
            $line = trim($line);
            if ($line === '') {
                continue;
            }
            $parts = explode('|', $line);
            $label = trim((string) ($parts[0] ?? ''));
            $result[] = array('label' => $label, 'value' => trim((string) ($parts[1] ?? $label)));
        }

        return $result;
    }

    private function parse_text_list(string $value): array
    {
        return array_values(array_filter(array_map('trim', preg_split('/\r?\n|,/', $value) ?: array()), static fn(string $item): bool => $item !== ''));
    }

    private function default_fields(): array
    {
        return array(
            array('type' => 'text', 'name' => 'fullName', 'label' => 'Full name', 'required' => true),
            array('type' => 'textarea', 'name' => 'message', 'label' => 'Message', 'required' => true),
            array('type' => 'submit', 'label' => 'Submit'),
        );
    }

    private function validate_nodes(array $blocks, string $path, ?string $parent, ?string $flow_root, bool $form_allows_drafts, array &$errors, array &$fields): void
    {
        foreach ($blocks as $index => $block) {
            $current_path = $path . '/' . $index;
            if (!is_array($block)) {
                $errors[] = $this->validation_issue('smartcloud_flow_invalid_block', 'Block node must be an object.', $current_path);
                continue;
            }
            $name = (string) ($block['blockName'] ?? '');
            if ($name === self::REACT_FALLBACK_BLOCK) {
                if (!in_array($parent, array('smartcloud-flow/form', 'smartcloud-flow/content-root'), true)) {
                    $errors[] = $this->validation_issue('smartcloud_flow_fallback_parent_invalid', 'The React fallback block is accepted only as a direct Form or Content Root child.', $current_path);
                }
                continue;
            }
            if ($name === 'core/group') {
                $class_name = (string) ($block['attrs']['className'] ?? '');
                $class_tokens = preg_split('/\\s+/', trim($class_name)) ?: array();
                if ($parent !== 'smartcloud-flow/modal') {
                    $errors[] = $this->validation_issue('smartcloud_flow_modal_slot_parent_invalid', 'A core/group modal slot is accepted only as a direct child of a Flow modal.', $current_path);
                }
                if (!in_array('wps-flow-modal-slot--body', $class_tokens, true)) {
                    $errors[] = $this->validation_issue('smartcloud_flow_modal_body_slot_invalid', 'The modal-gallery group must be the Flow modal body slot.', $current_path . '/attrs/className');
                }
                $slot_children = (array) ($block['innerBlocks'] ?? array());
                if (empty($slot_children)) {
                    $errors[] = $this->validation_issue('smartcloud_flow_modal_gallery_missing', 'The Flow modal body slot requires a Flow gallery.', $current_path);
                }
                foreach ($slot_children as $child) {
                    if (($child['blockName'] ?? '') !== 'smartcloud-flow/gallery') {
                        $errors[] = $this->validation_issue('smartcloud_flow_modal_body_child_invalid', 'The modal-gallery body slot may contain only Flow gallery blocks.', $current_path);
                    }
                }
                $this->validate_nodes(
                    $slot_children,
                    $current_path . '/innerBlocks',
                    'core/group',
                    $flow_root,
                    $form_allows_drafts,
                    $errors,
                    $fields
                );
                continue;
            }
            if ($name === 'core/image') {
                if ($parent !== 'smartcloud-flow/gallery') {
                    $errors[] = $this->validation_issue('smartcloud_flow_image_parent_invalid', 'A core/image block is accepted only as a direct child of a Flow gallery.', $current_path);
                }
                if (!empty($block['innerBlocks'])) {
                    $errors[] = $this->validation_issue('smartcloud_flow_gallery_image_not_leaf', 'A gallery image must be a leaf block.', $current_path);
                }
                $image_html = (string) ($block['innerHTML'] ?? '');
                if (
                    !preg_match('/<figure\\b[^>]*\\bwp-block-image\\b/i', $image_html)
                    || !preg_match('/<img\\b/i', $image_html)
                    || preg_match("~<(?:script|iframe|object|embed|form)\\b|<[^>]+\\son[a-z]+\\s*=|(?:href|src)\\s*=\\s*[\"']?\\s*javascript\\s*:~i", $image_html)
                ) {
                    $errors[] = $this->validation_issue('smartcloud_flow_gallery_image_invalid', 'A gallery image must contain safe canonical core/image markup.', $current_path);
                }
                continue;
            }
            if (!str_starts_with($name, 'smartcloud-flow/')) {
                $errors[] = $this->validation_issue('smartcloud_flow_unknown_block', 'Only Flow blocks, the canonical modal body group, and direct core/image Gallery children are accepted.', $current_path);
                continue;
            }
            $node_flow_root = $flow_root;
            if (in_array($name, $this->root_blocks, true)) {
                if ($node_flow_root !== null) {
                    $errors[] = $this->validation_issue('smartcloud_flow_nested_root', 'A Flow root cannot be nested in another Flow root.', $current_path);
                }
                $node_flow_root = $name;
            }
            $child_form_allows_drafts = $form_allows_drafts;
            if ($name === 'smartcloud-flow/form') {
                $child_form_allows_drafts = !empty($block['attrs']['allowDrafts']);
            }
            if ($node_flow_root === 'smartcloud-flow/content-root' && !in_array($name, array_merge(array('smartcloud-flow/content-root'), $this->content_blocks), true)) {
                $errors[] = $this->validation_issue('smartcloud_flow_form_block_under_content_root', 'Form-only Flow blocks are not allowed under content-root.', $current_path);
            }
            if ($name === 'smartcloud-flow/modal') {
                $modal_id = (string) ($block['attrs']['modalId'] ?? '');
                if ($modal_id === '' || sanitize_title($modal_id) !== $modal_id) {
                    $errors[] = $this->validation_issue('smartcloud_flow_modal_id_invalid', 'A Flow modal requires a non-empty slug-like modalId.', $current_path . '/attrs/modalId');
                }
                foreach ((array) ($block['innerBlocks'] ?? array()) as $child) {
                    if (($child['blockName'] ?? '') !== 'core/group') {
                        $errors[] = $this->validation_issue('smartcloud_flow_modal_gallery_child_invalid', 'The materialized modal-gallery component may contain only its canonical core/group body slot.', $current_path);
                    }
                }
                if (empty($block['innerBlocks'])) {
                    $errors[] = $this->validation_issue('smartcloud_flow_modal_gallery_missing', 'The materialized modal-gallery component requires a Flow gallery.', $current_path);
                }
            }
            if ($name === 'smartcloud-flow/gallery') {
                $gallery_id = (string) ($block['attrs']['galleryId'] ?? '');
                if ($gallery_id === '' || sanitize_title($gallery_id) !== $gallery_id) {
                    $errors[] = $this->validation_issue('smartcloud_flow_gallery_id_invalid', 'A Flow gallery requires a non-empty slug-like galleryId.', $current_path . '/attrs/galleryId');
                }
                $gallery_children = (array) ($block['innerBlocks'] ?? array());
                if (empty($gallery_children)) {
                    $errors[] = $this->validation_issue('smartcloud_flow_gallery_images_missing', 'A Flow gallery requires at least one core/image child.', $current_path);
                }
                foreach ($gallery_children as $child) {
                    if (($child['blockName'] ?? '') !== 'core/image') {
                        $errors[] = $this->validation_issue('smartcloud_flow_gallery_child_invalid', 'A Flow gallery may contain only core/image blocks.', $current_path);
                    }
                }
                $start_index = absint($block['attrs']['startIndex'] ?? 1);
                if ($start_index < 1 || (!empty($gallery_children) && $start_index > count($gallery_children))) {
                    $errors[] = $this->validation_issue('smartcloud_flow_gallery_start_index_invalid', 'Gallery startIndex must refer to an existing one-based image index.', $current_path . '/attrs/startIndex');
                }
            }
            if ($name === 'smartcloud-flow/wizard') {
                foreach ((array) ($block['innerBlocks'] ?? array()) as $child) {
                    if (($child['blockName'] ?? '') !== 'smartcloud-flow/wizard-step') {
                        $errors[] = $this->validation_issue('smartcloud_flow_wizard_child_invalid', 'A Flow wizard may contain only wizard-step blocks.', $current_path);
                    }
                }
            }
            if ($name === 'smartcloud-flow/save-draft-button' && !$form_allows_drafts) {
                $errors[] = $this->validation_issue('smartcloud_flow_drafts_not_enabled', 'A save-draft control requires allowDrafts=true on the ancestor form.', $current_path);
            }
            if (in_array($name, array_values($this->field_type_blocks), true) && empty($block['attrs']['hidden']) && isset($block['attrs']['name'])) {
                $field_name = trim((string) $block['attrs']['name']);
                if ($field_name === '') {
                    $errors[] = $this->validation_issue('smartcloud_flow_field_name_missing', 'Visible Flow fields require a non-empty name.', $current_path . '/attrs/name');
                } elseif (isset($fields[$field_name])) {
                    $errors[] = $this->validation_issue('smartcloud_flow_duplicate_field_name', 'Visible field names must be unique within one form.', $current_path . '/attrs/name');
                } else {
                    $fields[$field_name] = true;
                }
            }
            if ($name === 'smartcloud-flow/success-state') {
                $trigger = (string) ($block['attrs']['trigger'] ?? 'submit-success');
                if (!in_array($trigger, array('submit-success', 'ai-accepted'), true)) {
                    $errors[] = $this->validation_issue('smartcloud_flow_invalid_success_trigger', 'The success-state trigger is not supported.', $current_path . '/attrs/trigger');
                }
            }
            $this->validate_nodes(
                is_array($block['innerBlocks'] ?? null) ? $block['innerBlocks'] : array(),
                $current_path . '/innerBlocks',
                $name,
                $node_flow_root,
                $child_form_allows_drafts,
                $errors,
                $fields
            );
        }
    }

    private function backend_status_array(int $post_id): array
    {
        $settings = $this->settings_object();
        $status = array(
            'form_block_registered' => $this->block_registered('smartcloud-flow/form'),
            'backend_sync_enabled' => !is_object($settings) || !isset($settings->formsBackendSyncEnabled) || (bool) $settings->formsBackendSyncEnabled,
            'server_side_sync_service_exists' => false,
            'sync_mode' => 'editor-resave-required',
            'draft_runtime_available' => $this->block_registered('smartcloud-flow/save-draft-button'),
            'operations_available' => $this->block_registered('smartcloud-flow/operations'),
            'permanent_delete_allowed' => is_object($settings) && !empty($settings->formsAllowPermanentDelete),
            'synchronization_required' => true,
            'next_action' => $this->editor_sync_requirement(true)['next_action'],
        );

        if ($post_id > 0 && current_user_can('read_post', $post_id)) {
            $post = get_post($post_id);
            $status['post_id'] = $post_id;
            $status['contains_flow_form'] = $post instanceof \WP_Post && has_block('smartcloud-flow/form', $post);
            $status['sync'] = $this->sync_meta($post_id);
            $status['synchronization_required'] = $status['contains_flow_form'] && (($status['sync']['syncStatus'] ?? '') !== 'synced' || empty($status['sync']['formId']));
        }

        return $status;
    }

    private function sync_meta(int $post_id): array
    {
        if (class_exists('\SmartCloud\WPSuite\Flow\FormSyncMeta')) {
            return \SmartCloud\WPSuite\Flow\FormSyncMeta::getAllSyncMeta($post_id);
        }

        return array(
            'formId' => get_post_meta($post_id, 'workflows_backend_form_id', true) ?: null,
            'syncHash' => get_post_meta($post_id, 'workflows_backend_sync_hash', true) ?: null,
            'syncStatus' => get_post_meta($post_id, 'workflows_backend_sync_status', true) ?: null,
            'lastSynced' => get_post_meta($post_id, 'workflows_backend_last_synced_at', true) ?: null,
            'lastError' => get_post_meta($post_id, 'workflows_backend_last_error', true) ?: null,
            'sourceKind' => get_post_meta($post_id, 'workflows_backend_source_kind', true) ?: null,
        );
    }

    private function editor_sync_requirement(bool $required): array
    {
        return array(
            'sync_mode' => 'editor-resave-required',
            'synchronization_required' => $required,
            'next_action' => array(
                'action' => 'open-editor-and-save',
                'steps' => array(
                    'Open the draft in Gutenberg.',
                    'Allow Flow to perform its editor-side backend synchronization.',
                    'Wait until the form reports a synced state.',
                    'Save the draft again so the returned formId and sync metadata are persisted.',
                ),
            ),
        );
    }

    private function settings_object(): mixed
    {
        if (!function_exists('\SmartCloud\WPSuite\Flow\flow')) {
            return null;
        }
        $plugin = \SmartCloud\WPSuite\Flow\flow();
        if (!is_object($plugin)) {
            return null;
        }
        $ref = new \ReflectionObject($plugin);
        if (!$ref->hasProperty('admin')) {
            return null;
        }
        $prop = $ref->getProperty('admin');
        $prop->setAccessible(true);
        $admin = $prop->getValue($plugin);

        return is_object($admin) && method_exists($admin, 'getSettings') ? $admin->getSettings() : null;
    }

    /**
     * @return string[]
     */
    private function all_owned_blocks(): array
    {
        return array_values(array_unique(array_merge(
            $this->root_blocks,
            array_values($this->field_type_blocks),
            $this->content_blocks,
            $this->modal_gallery_blocks,
            array('smartcloud-flow/success-state', 'smartcloud-flow/submission-meta', 'smartcloud-flow/operations')
        )));
    }

    /**
     * @param string[] $block_names
     * @param array<string,bool> $block_status
     * @return string[]
     */
    private function missing_registered_blocks(array $block_names, array $block_status): array
    {
        $missing = array();
        foreach ($block_names as $block_name) {
            if (empty($block_status[$block_name])) {
                $missing[] = 'block-not-registered:' . $block_name;
            }
        }

        return $missing;
    }
}

(new Provider())->bootstrap();
