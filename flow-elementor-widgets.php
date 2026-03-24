<?php
/**
 * Elementor Flow Form Widget
 *
 * Provides Elementor widget for SmartCloud Flow Form block
 */

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

    public function __construct($data = [], $args = null)
    {
        parent::__construct($data, $args);

        self::$COLOR_MODES = [
            'auto' => __('System', 'smartcloud-flow'),
            'light' => __('Light', 'smartcloud-flow'),
            'dark' => __('Dark', 'smartcloud-flow'),
        ];
    }

    public function get_categories()
    {
        return ['smartcloud-flow'];
    }
}

class Flow_Form_Widget extends Flow_Base_Widget
{
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
        $this->add_control('hideFormOnSuccess', [
            'label' => __('Hide Form on Success', 'smartcloud-flow'),
            'type' => \Elementor\Controls_Manager::SWITCHER,
            'label_on' => __('Yes', 'smartcloud-flow'),
            'label_off' => __('No', 'smartcloud-flow'),
            'return_value' => 'yes',
            'default' => 'yes',
            'description' => __('Hide form fields after successful submission and only show the success message.', 'smartcloud-flow'),
        ]);

        $this->add_control('colorMode', [
            'label' => __('Color Mode', 'smartcloud-flow'),
            'type' => \Elementor\Controls_Manager::SELECT,
            'options' => self::$COLOR_MODES,
            'default' => 'auto',
        ]);

        $this->add_control('primaryColor', [
            'label' => __('Primary Color', 'smartcloud-flow'),
            'type' => \Elementor\Controls_Manager::SELECT,
            'options' => [
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
            'default' => 'blue',

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
            'hideFormOnSuccess',
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
}

add_action('elementor/widgets/register', static function ($m) {
    $m->register(new \Flow_Form_Widget());
});
