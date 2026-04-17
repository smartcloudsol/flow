<?php
/**
 * Elementor Flow Form Widget
 *
 * Provides Elementor widget for SmartCloud Flow Form block
 */

namespace SmartCloud\WPSuite\Flow;

if (!defined('ABSPATH')) {
    exit;
}

if (!function_exists('smartcloud_flow_do_shortcode')) {
    function smartcloud_flow_do_shortcode(string $tag, array $atts = [], string $body = '')
    {
        $shortcode = sprintf(
            '[%s %s]',
            esc_attr($tag),
            implode(' ', array_map(
                fn($k, $v) => sprintf('%s="%s"', esc_attr($k), esc_attr($v)),
                array_keys($atts),
                $atts
            ))
        );

        if (!empty($body)) {
            $shortcode = sprintf(
                '[%s %s]%s[/%s]',
                esc_attr($tag),
                implode(' ', array_map(
                    fn($k, $v) => sprintf('%s="%s"', esc_attr($k), esc_attr($v)),
                    array_keys($atts),
                    $atts
                )),
                $body,
                esc_attr($tag)
            );
        }
        echo do_shortcode($shortcode);
    }
}

add_action('elementor/elements/categories_registered', static function ($manager) {
    $manager->add_category('smartcloud-flow', [
        'title' => __('SmartCloud - Flow', 'smartcloud-flow'),
        'icon' => 'fa fa-water',
    ]);
});

abstract class Flow_Base_Widget extends \Elementor\Widget_Base
{
    protected static array $COLOR_MODES;
    protected static array $LANGUAGES;
    protected static array $DIRECTIONS;
    protected static array $SIZE_OPTIONS;
    protected static array $BOOLEAN_OVERRIDE_OPTIONS;

    public function __construct($data = [], $args = null)
    {
        parent::__construct($data, $args);

        self::$COLOR_MODES = [
            '' => __('Default', 'smartcloud-flow'),
            'auto' => __('System', 'smartcloud-flow'),
            'light' => __('Light', 'smartcloud-flow'),
            'dark' => __('Dark', 'smartcloud-flow'),
        ];

        self::$LANGUAGES = [
            '' => __('Default', 'smartcloud-flow'),
            'ar' => __('Arabic', 'smartcloud-flow'),
            'zh' => __('Chinese', 'smartcloud-flow'),
            'nl' => __('Dutch', 'smartcloud-flow'),
            'en' => __('English', 'smartcloud-flow'),
            'fr' => __('French', 'smartcloud-flow'),
            'de' => __('German', 'smartcloud-flow'),
            'he' => __('Hebrew', 'smartcloud-flow'),
            'hi' => __('Hindi', 'smartcloud-flow'),
            'hu' => __('Hungarian', 'smartcloud-flow'),
            'id' => __('Indonesian', 'smartcloud-flow'),
            'it' => __('Italian', 'smartcloud-flow'),
            'ja' => __('Japanese', 'smartcloud-flow'),
            'ko' => __('Korean', 'smartcloud-flow'),
            'nb' => __('Norwegian', 'smartcloud-flow'),
            'pl' => __('Polish', 'smartcloud-flow'),
            'pt' => __('Portuguese', 'smartcloud-flow'),
            'ru' => __('Russian', 'smartcloud-flow'),
            'es' => __('Spanish', 'smartcloud-flow'),
            'sv' => __('Swedish', 'smartcloud-flow'),
            'th' => __('Thai', 'smartcloud-flow'),
            'tr' => __('Turkish', 'smartcloud-flow'),
            'ua' => __('Ukrainian', 'smartcloud-flow'),
        ];

        self::$DIRECTIONS = [
            '' => __('Default', 'smartcloud-flow'),
            'auto' => __('Auto (by language)', 'smartcloud-flow'),
            'ltr' => __('Left to Right', 'smartcloud-flow'),
            'rtl' => __('Right to Left', 'smartcloud-flow'),
        ];

        self::$SIZE_OPTIONS = [
            '' => __('Default', 'smartcloud-flow'),
            'xs' => 'XS',
            'sm' => 'SM',
            'md' => 'MD',
            'lg' => 'LG',
            'xl' => 'XL',
        ];

        self::$BOOLEAN_OVERRIDE_OPTIONS = [
            '' => __('Default', 'smartcloud-flow'),
            'true' => __('True', 'smartcloud-flow'),
            'false' => __('False', 'smartcloud-flow'),
        ];
    }

    public function get_categories()
    {
        return ['smartcloud-flow'];
    }
}

class Flow_Form_Widget extends Flow_Base_Widget
{
    private const FLOW_BLOCK_PREFIX = 'smartcloud-flow/';

    public function get_name()
    {
        return 'smartcloud_flow_form';
    }

    public function get_title()
    {
        return __('Flow Form', 'smartcloud-flow');
    }

    public function get_icon()
    {
        return 'eicon-form-horizontal';
    }

    protected function register_controls()
    {
        $field_target_options = $this->get_pattern_override_target_options();

        $this->start_controls_section('pattern-block', ['label' => __('Pattern', 'smartcloud-flow')]);
        $options = [];
        $patterns = get_posts([
            'post_type' => 'wp_block',
            's' => 'smartcloud-flow',
            'posts_per_page' => 200,
            'orderby' => 'title',
            'order' => 'ASC',
        ]);
        foreach ($patterns as $p) {
            $options[$p->ID] = $p->post_title ?: $p->ID;
        }
        $this->add_control('pattern', [
            'label' => __('Pattern ID', 'smartcloud-flow'),
            'type' => \Elementor\Controls_Manager::SELECT2,
            'options' => $options,
            'label_block' => true,
            'multiple' => false,
        ]);
        $this->end_controls_section();

        $this->start_controls_section('overrides-block', ['label' => __('Overrides', 'smartcloud-flow')]);
        $this->add_control('formId', ['label' => __('Form ID', 'smartcloud-flow'), 'type' => \Elementor\Controls_Manager::TEXT]);
        $this->add_control('formName', ['label' => __('Form Name', 'smartcloud-flow'), 'type' => \Elementor\Controls_Manager::TEXT]);
        $this->add_control('submitLabel', ['label' => __('Submit Label', 'smartcloud-flow'), 'type' => \Elementor\Controls_Manager::TEXT]);
        $this->add_control('successMessage', ['label' => __('Success Message', 'smartcloud-flow'), 'type' => \Elementor\Controls_Manager::TEXT]);
        $this->add_control('errorMessage', ['label' => __('Error Message', 'smartcloud-flow'), 'type' => \Elementor\Controls_Manager::TEXT]);
        $this->add_control('endpointPath', ['label' => __('Endpoint Path', 'smartcloud-flow'), 'type' => \Elementor\Controls_Manager::TEXT]);
        $this->add_control('language', [
            'label' => __('Language', 'smartcloud-flow'),
            'type' => \Elementor\Controls_Manager::SELECT,
            'options' => self::$LANGUAGES,
            'default' => '',
            'description' => __('Leave empty to inherit the pattern language.', 'smartcloud-flow'),
        ]);
        $this->add_control('direction', [
            'label' => __('Direction', 'smartcloud-flow'),
            'type' => \Elementor\Controls_Manager::SELECT,
            'options' => self::$DIRECTIONS,
            'default' => '',
            'description' => __('Leave empty to inherit the pattern direction.', 'smartcloud-flow'),
        ]);
        $this->add_control('hideFormOnSuccess', [
            'label' => __('Hide Form on Success', 'smartcloud-flow'),
            'type' => \Elementor\Controls_Manager::CHOOSE,
            'options' => [
                'true' => [
                    'title' => __('Yes', 'smartcloud-flow'),
                    'icon' => 'eicon-check-circle-o',
                ],
                'false' => [
                    'title' => __('No', 'smartcloud-flow'),
                    'icon' => 'eicon-ban',
                ],
            ],
            'default' => '',
            'toggle' => true,
            'description' => __('Leave both options unselected to inherit the pattern value. Select Yes or No only when you want to override it.', 'smartcloud-flow'),
        ]);

        $this->add_control('allowDrafts', [
            'label' => __('Allow Draft Saving', 'smartcloud-flow'),
            'type' => \Elementor\Controls_Manager::CHOOSE,
            'options' => [
                'true' => [
                    'title' => __('Yes', 'smartcloud-flow'),
                    'icon' => 'eicon-check-circle-o',
                ],
                'false' => [
                    'title' => __('No', 'smartcloud-flow'),
                    'icon' => 'eicon-ban',
                ],
            ],
            'default' => '',
            'toggle' => true,
            'description' => __('Leave unselected to inherit the pattern value.', 'smartcloud-flow'),
        ]);

        $this->add_control('showDraftResumePanel', [
            'label' => __('Show Draft Resume Panel', 'smartcloud-flow'),
            'type' => \Elementor\Controls_Manager::CHOOSE,
            'options' => [
                'true' => [
                    'title' => __('Yes', 'smartcloud-flow'),
                    'icon' => 'eicon-check-circle-o',
                ],
                'false' => [
                    'title' => __('No', 'smartcloud-flow'),
                    'icon' => 'eicon-ban',
                ],
            ],
            'default' => '',
            'toggle' => true,
            'description' => __('Leave unselected to inherit the pattern value.', 'smartcloud-flow'),
        ]);

        $this->add_control('draftAllowDelete', [
            'label' => __('Allow Draft Deletion', 'smartcloud-flow'),
            'type' => \Elementor\Controls_Manager::CHOOSE,
            'options' => [
                'true' => [
                    'title' => __('Yes', 'smartcloud-flow'),
                    'icon' => 'eicon-check-circle-o',
                ],
                'false' => [
                    'title' => __('No', 'smartcloud-flow'),
                    'icon' => 'eicon-ban',
                ],
            ],
            'default' => '',
            'toggle' => true,
            'description' => __('Leave unselected to inherit the pattern value.', 'smartcloud-flow'),
        ]);

        $this->add_control('draftExpiryDays', [
            'label' => __('Draft Expiry (Days)', 'smartcloud-flow'),
            'type' => \Elementor\Controls_Manager::NUMBER,
            'description' => __('Leave empty to inherit the pattern value.', 'smartcloud-flow'),
            'min' => 1,
        ]);

        $this->add_control('draftResumeTitle', ['label' => __('Draft Resume Title', 'smartcloud-flow'), 'type' => \Elementor\Controls_Manager::TEXT]);
        $this->add_control('draftResumeDescription', ['label' => __('Draft Resume Description', 'smartcloud-flow'), 'type' => \Elementor\Controls_Manager::TEXTAREA]);
        $this->add_control('draftSaveSuccessMessage', ['label' => __('Draft Save Success Message', 'smartcloud-flow'), 'type' => \Elementor\Controls_Manager::TEXT]);

        $this->add_control('colorMode', [
            'label' => __('Color Mode', 'smartcloud-flow'),
            'type' => \Elementor\Controls_Manager::SELECT,
            'options' => self::$COLOR_MODES,
            'default' => '',
        ]);

        $this->add_control('primaryColor', [
            'label' => __('Primary Color', 'smartcloud-flow'),
            'type' => \Elementor\Controls_Manager::SELECT,
            'options' => [
                '' => __('Default', 'smartcloud-flow'),
                'cyan' => __('Cyan', 'smartcloud-flow'),
                'blue' => __('Blue', 'smartcloud-flow'),
                'indigo' => __('Indigo', 'smartcloud-flow'),
                'violet' => __('Violet', 'smartcloud-flow'),
                'grape' => __('Grape', 'smartcloud-flow'),
                'pink' => __('Pink', 'smartcloud-flow'),
                'red' => __('Red', 'smartcloud-flow'),
                'orange' => __('Orange', 'smartcloud-flow'),
                'yellow' => __('Yellow', 'smartcloud-flow'),
                'lime' => __('Lime', 'smartcloud-flow'),
                'green' => __('Green', 'smartcloud-flow'),
                'teal' => __('Teal', 'smartcloud-flow'),
                'gray' => __('Gray', 'smartcloud-flow'),
                'dark' => __('Dark', 'smartcloud-flow'),
                'custom' => __('Custom', 'smartcloud-flow'),
            ],
            'description' => __('Mantine theme color name', 'smartcloud-flow'),
            'default' => '',

        ]);

        $this->add_control('customColor', [
            'label' => __('Custom Color', 'smartcloud-flow'),
            'type' => \Elementor\Controls_Manager::COLOR,
            'description' => __('Custom color hex value (used when Primary Color is set to Custom)', 'smartcloud-flow'),
            'condition' => [
                'primaryColor' => 'custom',
            ],
        ]);

        $this->add_control('primaryShade_light', [
            'label' => __('Primary Shade (Light)', 'smartcloud-flow'),
            'type' => \Elementor\Controls_Manager::SELECT,
            'options' => [
                '' => __('Default', 'smartcloud-flow'),
                '0' => '0',
                '1' => '1',
                '2' => '2',
                '3' => '3',
                '4' => '4',
                '5' => '5',
                '6' => '6',
                '7' => '7',
                '8' => '8',
                '9' => '9',
            ],
            'description' => __('Primary shade for light mode (0-9)', 'smartcloud-flow'),
        ]);

        $this->add_control('primaryShade_dark', [
            'label' => __('Primary Shade (Dark)', 'smartcloud-flow'),
            'type' => \Elementor\Controls_Manager::SELECT,
            'options' => [
                '' => __('Default', 'smartcloud-flow'),
                '0' => '0',
                '1' => '1',
                '2' => '2',
                '3' => '3',
                '4' => '4',
                '5' => '5',
                '6' => '6',
                '7' => '7',
                '8' => '8',
                '9' => '9',
            ],
            'description' => __('Primary shade for dark mode (0-9)', 'smartcloud-flow'),
        ]);

        $this->add_control('themeOverrides', [
            'label' => __('Theme Overrides (CSS)', 'smartcloud-flow'),
            'type' => \Elementor\Controls_Manager::TEXTAREA,
            'description' => __('Custom CSS for theming', 'smartcloud-flow'),
        ]);

        $this->add_control('configYaml', [
            'label' => __('Advanced Config (YAML)', 'smartcloud-flow'),
            'type' => \Elementor\Controls_Manager::TEXTAREA,
            'description' => __('Extra Flow config merged through the shortcode YAML body. Use this for fieldOverrides or other advanced Mantine props.', 'smartcloud-flow'),
            'rows' => 10,
        ]);

        $this->end_controls_section();

        $repeater = new \Elementor\Repeater();
        $repeater->add_control('fieldKeyPreset', [
            'label' => __('Field from schema', 'smartcloud-flow'),
            'type' => \Elementor\Controls_Manager::SELECT2,
            'options' => $field_target_options,
            'label_block' => true,
            'description' => __('Generated from the selected Flow pattern, including nested containers and wizard steps. Name-based targets and explicit path targets are both listed.', 'smartcloud-flow'),
        ]);
        $repeater->add_control('fieldKey', [
            'label' => __('Field name or path', 'smartcloud-flow'),
            'type' => \Elementor\Controls_Manager::TEXT,
            'description' => __('Manual fallback. Use a field name or parsed path like 0.2.1 if the schema list is empty or you need a custom target.', 'smartcloud-flow'),
            'label_block' => true,
        ]);
        $repeater->add_control('size', [
            'label' => __('Block size', 'smartcloud-flow'),
            'type' => \Elementor\Controls_Manager::SELECT,
            'options' => self::$SIZE_OPTIONS,
            'default' => '',
        ]);
        $repeater->add_control('inputSize', [
            'label' => __('Input size', 'smartcloud-flow'),
            'type' => \Elementor\Controls_Manager::SELECT,
            'options' => self::$SIZE_OPTIONS,
            'default' => '',
        ]);
        $repeater->add_control('placeholder', [
            'label' => __('Placeholder', 'smartcloud-flow'),
            'type' => \Elementor\Controls_Manager::TEXT,
            'description' => __('Common for text-like inputs.', 'smartcloud-flow'),
        ]);
        $repeater->add_control('description', [
            'label' => __('Description', 'smartcloud-flow'),
            'type' => \Elementor\Controls_Manager::TEXTAREA,
            'description' => __('Help text shown below the field in the rendered form.', 'smartcloud-flow'),
        ]);
        $repeater->add_control('disabled', [
            'label' => __('Disabled', 'smartcloud-flow'),
            'type' => \Elementor\Controls_Manager::SELECT,
            'options' => self::$BOOLEAN_OVERRIDE_OPTIONS,
            'default' => '',
            'description' => __('Applies broadly across interactive fields.', 'smartcloud-flow'),
        ]);
        $repeater->add_control('required', [
            'label' => __('Required', 'smartcloud-flow'),
            'type' => \Elementor\Controls_Manager::SELECT,
            'options' => self::$BOOLEAN_OVERRIDE_OPTIONS,
            'default' => '',
            'description' => __('Shows the usual required marker where the target component supports it.', 'smartcloud-flow'),
        ]);

        $this->start_controls_section('field-overrides-block', ['label' => __('Field Overrides', 'smartcloud-flow')]);
        $this->add_control('fieldOverrides', [
            'label' => __('Common field overrides', 'smartcloud-flow'),
            'type' => \Elementor\Controls_Manager::REPEATER,
            'fields' => $repeater->get_controls(),
            'title_field' => '{{{ fieldKeyPreset || fieldKey || "override" }}}',
            'description' => __('These controls generate fieldOverrides in the shortcode YAML. Duplicate targets are merged, so the later repeater row overrides earlier values for the same field.', 'smartcloud-flow'),
        ]);
        $this->end_controls_section();
    }

    protected function render()
    {
        $all = $this->get_settings_for_display();

        // Simple attributes that go in shortcode attributes
        $simple_attrs = [
            'formId',
            'formName',
            'submitLabel',
            'successMessage',
            'errorMessage',
            'endpointPath',
            'language',
            'direction',
            'hideFormOnSuccess',
            'allowDrafts',
            'showDraftResumePanel',
            'draftExpiryDays',
            'draftAllowDelete',
            'draftResumeTitle',
            'draftResumeDescription',
            'draftSaveSuccessMessage',
            'colorMode',
            'primaryColor'
        ];

        // Filter settings to only include allowed attributes with non-empty values
        $atts = array_intersect_key($all, array_flip($simple_attrs));
        $atts['id'] = $all['pattern'];
        $atts = array_filter(
            $atts,
            fn($v, $k) =>
            !is_array($v) && !is_object($v) && $v !== '',
            ARRAY_FILTER_USE_BOTH
        );


        // Build YAML body for complex attributes
        $yaml_parts = [];

        // colors object
        $colors = [];

        // If customColor is set and primaryColor is 'custom', add it to colors
        if (!empty($all['customColor']) && !empty($all['primaryColor']) && $all['primaryColor'] === 'custom') {
            $custom_color = $all['customColor'];
            // Ensure it's a valid hex color (with or without #)
            if (preg_match('/^#?([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$/', $custom_color)) {
                // Add # prefix if missing
                $colors['custom'] = (strpos($custom_color, '#') === 0) ? $custom_color : '#' . $custom_color;
            }
        }

        // Also include any existing colors array
        if (!empty($all['colors']) && is_array($all['colors'])) {
            $colors = array_merge($colors, $all['colors']);
        }

        if (!empty($colors)) {
            $yaml_parts[] = 'colors:';
            foreach ($colors as $key => $value) {
                $yaml_parts[] = "  $key: " . $this->yaml_encode_value($value);
            }
        }

        // primaryShade object
        if (!empty($all['primaryShade_light']) || !empty($all['primaryShade_dark'])) {
            $yaml_parts[] = 'primaryShade:';
            if (!empty($all['primaryShade_light'])) {
                $yaml_parts[] = '  light: ' . intval($all['primaryShade_light']);
            }
            if (!empty($all['primaryShade_dark'])) {
                $yaml_parts[] = '  dark: ' . intval($all['primaryShade_dark']);
            }
        }

        // themeOverrides
        if (!empty($all['themeOverrides'])) {
            // Escape and indent the CSS content
            $theme_overrides = trim($all['themeOverrides']);
            $yaml_parts[] = 'themeOverrides: |';
            foreach (explode("\n", $theme_overrides) as $line) {
                $yaml_parts[] = '  ' . $line;
            }
        }

        if (!empty($all['fieldOverrides']) && is_array($all['fieldOverrides'])) {
            $field_override_map = [];

            foreach ($all['fieldOverrides'] as $override) {
                if (!is_array($override)) {
                    continue;
                }

                $field_key = isset($override['fieldKeyPreset']) && trim((string) $override['fieldKeyPreset']) !== ''
                    ? trim((string) $override['fieldKeyPreset'])
                    : (isset($override['fieldKey']) ? trim((string) $override['fieldKey']) : '');
                if ($field_key === '') {
                    continue;
                }

                $override_values = [];
                foreach (['size', 'inputSize', 'placeholder', 'description'] as $scalar_key) {
                    if (!empty($override[$scalar_key])) {
                        $override_values[$scalar_key] = $override[$scalar_key];
                    }
                }

                foreach (['disabled', 'required'] as $boolean_key) {
                    if (($override[$boolean_key] ?? '') === 'true') {
                        $override_values[$boolean_key] = true;
                    } elseif (($override[$boolean_key] ?? '') === 'false') {
                        $override_values[$boolean_key] = false;
                    }
                }

                if (empty($override_values)) {
                    continue;
                }

                $field_override_map[$field_key] = array_merge(
                    $field_override_map[$field_key] ?? [],
                    $override_values
                );
            }

            if (!empty($field_override_map)) {
                $field_override_lines = [];
                foreach ($field_override_map as $field_key => $override_values) {
                    $field_override_lines[] = '  ' . $this->yaml_encode_key((string) $field_key) . ':';
                    foreach ($override_values as $key => $value) {
                        $field_override_lines[] = '    ' . $key . ': ' . $this->yaml_encode_value($value);
                    }
                }

                $yaml_parts[] = 'fieldOverrides:';
                $yaml_parts = array_merge($yaml_parts, $field_override_lines);
            }
        }

        if (!empty($all['configYaml'])) {
            $config_yaml = trim($all['configYaml']);
            if ($config_yaml !== '') {
                if (!empty($yaml_parts)) {
                    $yaml_parts[] = '';
                }
                foreach (explode("\n", $config_yaml) as $line) {
                    $yaml_parts[] = rtrim($line, "\r");
                }
            }
        }

        $body = !empty($yaml_parts) ? implode("\n", $yaml_parts) : '';

        smartcloud_flow_do_shortcode('smartcloud-flow-form', $atts, $body);
    }

    private function yaml_encode_value($value)
    {
        if (is_bool($value)) {
            return $value ? 'true' : 'false';
        }
        if (is_numeric($value)) {
            return $value;
        }
        // Escape special characters and quote strings
        if (strpos($value, ':') !== false || strpos($value, '#') !== false || strpos($value, '"') !== false) {
            return '"' . str_replace('"', '\\"', $value) . '"';
        }
        return $value;
    }

    private function yaml_encode_key(string $value): string
    {
        if (preg_match('/^[A-Za-z0-9_.-]+$/', $value)) {
            return $value;
        }

        return '"' . str_replace('"', '\\"', $value) . '"';
    }

    private function get_pattern_override_target_options(): array
    {
        $pattern_id = $this->get_selected_pattern_id();
        if (!$pattern_id) {
            return [
                '' => __('Select a pattern to load schema targets', 'smartcloud-flow'),
            ];
        }

        $pattern_post = get_post($pattern_id);
        if (!$pattern_post || $pattern_post->post_type !== 'wp_block') {
            return [
                '' => __('Pattern not found', 'smartcloud-flow'),
            ];
        }

        $blocks = parse_blocks((string) $pattern_post->post_content);
        foreach ($blocks as $block) {
            if (($block['blockName'] ?? '') !== 'smartcloud-flow/form') {
                continue;
            }

            $options = [];
            $this->collect_override_target_options($block['innerBlocks'] ?? [], [], $options);

            return !empty($options)
                ? $options
                : ['' => __('No Flow fields found in pattern', 'smartcloud-flow')];
        }

        return [
            '' => __('Pattern does not contain a Flow form', 'smartcloud-flow'),
        ];
    }

    private function get_selected_pattern_id(): int
    {
        $settings = [];
        if (isset($this->data['settings']) && is_array($this->data['settings'])) {
            $settings = $this->data['settings'];
        }
        $pattern_id = isset($settings['pattern']) ? intval($settings['pattern']) : 0;
        return $pattern_id > 0 ? $pattern_id : 0;
    }

    private function collect_override_target_options(array $blocks, array $path, array &$options): void
    {
        foreach ($blocks as $index => $block) {
            if (!is_array($block)) {
                continue;
            }

            $block_name = isset($block['blockName']) ? (string) $block['blockName'] : '';
            if ($block_name === '' || strpos($block_name, self::FLOW_BLOCK_PREFIX) !== 0) {
                continue;
            }

            $current_path = array_merge($path, [intval($index) + 1]);
            $attrs = (isset($block['attrs']) && is_array($block['attrs'])) ? $block['attrs'] : [];

            if ($block_name !== 'smartcloud-flow/form') {
                $type = substr($block_name, strlen(self::FLOW_BLOCK_PREFIX));
                $path_key = implode('.', $current_path);
                $target_key = isset($attrs['name']) && is_string($attrs['name']) && trim($attrs['name']) !== ''
                    ? trim($attrs['name'])
                    : $path_key;

                $summary = $this->describe_flow_block_target($type, $attrs, $path_key);
                $options[$target_key] = sprintf(
                    /* translators: Formats and assigns a localized option label to the $options array for a given target key. The label is generated using the provided $summary, which represents a brief description or summary of the target or path. The formatted string includes the summary followed by "[name]", and is localized using the 'smartcloud-flow' text domain for translation support.*/
                    __('%s [name]', 'smartcloud-flow'),
                    $summary
                );

                if ($target_key !== $path_key) {
                    $options[$path_key] = sprintf(
                        /* translators: Formats and assigns a localized option label to the $options array for a given target key. The label is generated using the provided $summary, which represents a brief description or summary of the target or path. The formatted string includes the summary followed by "[path]", and is localized using the 'smartcloud-flow' text domain for translation support. */
                        __('%s [path]', 'smartcloud-flow'),
                        $summary
                    );
                }
            }

            $inner_blocks = (isset($block['innerBlocks']) && is_array($block['innerBlocks']))
                ? $block['innerBlocks']
                : [];
            if (!empty($inner_blocks)) {
                $this->collect_override_target_options($inner_blocks, $current_path, $options);
            }
        }
    }

    private function describe_flow_block_target(string $type, array $attrs, string $path_key): string
    {
        $base_label = ucwords(str_replace(['-', '_'], ' ', $type));

        foreach (['label', 'title', 'legend', 'name'] as $attr_key) {
            if (isset($attrs[$attr_key]) && is_string($attrs[$attr_key]) && trim($attrs[$attr_key]) !== '') {
                return sprintf('%s: %s (%s)', $base_label, trim($attrs[$attr_key]), $path_key);
            }
        }

        return sprintf('%s (%s)', $base_label, $path_key);
    }
}

add_action('elementor/widgets/register', static function ($m) {
    $m->register(new \SmartCloud\WPSuite\Flow\Flow_Form_Widget());
});
