<?php

declare(strict_types=1);

define('ABSPATH', __DIR__ . '/');

function wp_rand(): int
{
    return 1234;
}

function wp_json_encode($value): string
{
    return (string) json_encode($value);
}

function esc_attr($value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

function get_block_wrapper_attributes(array $attributes = []): string
{
    return 'class="' . ($attributes['class'] ?? 'wp-block-test') . '"';
}

function wp_kses_data($value): string
{
    return (string) $value;
}

function wp_kses_post($value): string
{
    return (string) $value;
}

function get_the_ID(): int
{
    return 0;
}

function sanitize_key($value): string
{
    return (string) $value;
}

function sanitize_title($value): string
{
    return (string) $value;
}

function wp_strip_all_tags($value): string
{
    return strip_tags((string) $value);
}

final class TestInnerBlock
{
    public function __construct(public string $name, private string $html)
    {
    }

    public function render(): string
    {
        return $this->html;
    }
}

function renderTemplate(string $template, array $innerBlocks): string
{
    $attributes = ['operationName' => 'test'];
    $content = '<!-- wp:smartcloud-flow/text --><p>configuration child</p><!-- /wp:smartcloud-flow/text -->';
    $block = (object) ['inner_blocks' => $innerBlocks, 'context' => []];

    ob_start();
    include $template;
    return (string) ob_get_clean();
}

function expect(bool $condition, string $message): void
{
    if (!$condition) {
        fwrite(STDERR, $message . PHP_EOL);
        exit(1);
    }
}

$fallback = new TestInnerBlock('wpsuite/react-fallback', '<div data-wpsuite-react-fallback><fallback-placeholder data-fallback-marker></fallback-placeholder></div>');
$config = new TestInnerBlock('smartcloud-flow/text', '<p>configuration child</p>');

foreach (['form', 'content-root'] as $blockName) {
    $template = dirname(__DIR__) . '/src/' . $blockName . '/render.php';
    $withFallback = renderTemplate($template, [$fallback, $config]);
    $withoutFallback = renderTemplate($template, [$config]);

    expect(str_contains($withFallback, 'data-wpsuite-react-fallback'), $blockName . ' must render its authored fallback.');
    expect(str_contains($withFallback, 'data-fallback-marker'), $blockName . ' must preserve native rendered child-block markup without a second allowlist.');
    expect(str_contains($withFallback, 'smartcloud-flow-' . $blockName . '__mount'), $blockName . ' must expose a dedicated React mount.');
    expect(str_contains($withoutFallback, 'smartcloud-flow-' . $blockName . '__mount'), $blockName . ' must remain mountable without a fallback.');
}

$pluginSource = (string) file_get_contents(dirname(__DIR__, 2) . '/smartcloud-flow.php');
$widgetSource = (string) file_get_contents(dirname(__DIR__, 2) . '/flow-elementor-widgets.php');

expect(str_contains($pluginSource, "renderShortcodeBlock('smartcloud-flow/form', \$form_block"), 'Flow form shortcode must retain the selected pattern block.');
expect(str_contains($pluginSource, "'smartcloud-flow/content-root',\n            \$content_root_block"), 'Flow content-root shortcode must retain the selected pattern block.');
expect(str_contains($widgetSource, "\$atts['id'] = \$all['pattern'];"), 'Flow Elementor widgets must pass their pattern as shortcode ID.');
expect(str_contains($widgetSource, "smartcloud_flow_do_shortcode('smartcloud-flow-form'"), 'Flow form Elementor widget must retain its shortcode adapter.');
expect(str_contains($widgetSource, "smartcloud_flow_do_shortcode('smartcloud-flow-content-root'"), 'Flow content-root Elementor widget must retain its shortcode adapter.');

fwrite(STDOUT, "Flow fallback, shortcode and Elementor compatibility checks passed.\n");
