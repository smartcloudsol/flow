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

function esc_html($value): string
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
    return 42;
}

function get_post_type(int $postId): string
{
    return 42 === $postId ? 'post' : '';
}

function get_post_field(string $field, int $postId): string
{
    return 42 === $postId && 'post_name' === $field ? 'discussion-test-post' : '';
}

function get_the_title(int $postId): string
{
    return 42 === $postId ? 'Discussion test post' : '';
}

function get_permalink(int $postId): string
{
    return 42 === $postId ? 'https://example.test/discussion-test-post/' : '';
}

final class TestFormSyncMeta
{
    public static function getFormId(int $postId): ?string
    {
        return 42 === $postId ? 'form-from-post-meta' : null;
    }
}

class_alias(TestFormSyncMeta::class, 'SmartCloud\\WPSuite\\Flow\\FormSyncMeta');

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

$discussionTemplate = dirname(__DIR__) . '/src/discussion/render.php';
$discussion = renderTemplate($discussionTemplate, []);
$discussionConfig = '';
if (preg_match('/data-config="([^"]+)"/', $discussion, $matches)) {
    $discussionConfig = html_entity_decode($matches[1], ENT_QUOTES, 'UTF-8');
}
$decodedDiscussion = json_decode((string) base64_decode($discussionConfig, true), true);
expect(is_array($decodedDiscussion), 'Flow discussion must expose a decodable runtime configuration.');
expect(str_contains($discussion, 'data-wpsuite-react-fallback'), 'Flow discussion must mark its loading fallback for dismissal after React mounts.');
expect(($decodedDiscussion['formId'] ?? null) === 'form-from-post-meta', 'Flow discussion must inherit the synchronized form ID for the current post.');
expect(($decodedDiscussion['contentRef'] ?? null) === ['namespace' => 'wordpress', 'type' => 'post', 'id' => '42'], 'Flow discussion must bind to the current WordPress post ID.');

$ratingSummaryTemplate = dirname(__DIR__) . '/src/rating-summary/render.php';
$ratingSummary = renderTemplate($ratingSummaryTemplate, []);
$ratingSummaryConfig = '';
if (preg_match('/data-config="([^"]+)"/', $ratingSummary, $matches)) {
    $ratingSummaryConfig = html_entity_decode($matches[1], ENT_QUOTES, 'UTF-8');
}
$decodedRatingSummary = json_decode((string) base64_decode($ratingSummaryConfig, true), true);
expect(is_array($decodedRatingSummary), 'Flow rating summary must expose a decodable runtime configuration.');
expect(str_contains($ratingSummary, 'data-wpsuite-react-fallback'), 'Flow rating summary must retain a loading fallback until React mounts.');
expect(str_contains($ratingSummary, 'smartcloud-flow-rating-summary__mount'), 'Flow rating summary must expose a dedicated React mount.');
expect(($decodedRatingSummary['formId'] ?? null) === 'form-from-post-meta', 'Flow rating summary must inherit the synchronized form ID for the current post.');
expect(($decodedRatingSummary['contentRef'] ?? null) === ['namespace' => 'wordpress', 'type' => 'post', 'id' => '42'], 'Flow rating summary must bind to the current WordPress post ID.');

$pluginSource = (string) file_get_contents(dirname(__DIR__, 2) . '/smartcloud-flow.php');
$widgetSource = (string) file_get_contents(dirname(__DIR__, 2) . '/flow-elementor-widgets.php');

expect(str_contains($pluginSource, "renderShortcodeBlock('smartcloud-flow/form', \$form_block"), 'Flow form shortcode must retain the selected pattern block.');
expect(str_contains($pluginSource, "\$block_atts['formId'] = \$backend_form_id;"), 'Flow form shortcode must pass the synchronized backend ID as formId.');
expect(!str_contains($pluginSource, "\$block_atts['backendFormId'] = \$backend_form_id;"), 'Flow form shortcode must not use the unsupported backendFormId attribute.');
expect(str_contains($pluginSource, "'smartcloud-flow/content-root',\n            \$content_root_block"), 'Flow content-root shortcode must retain the selected pattern block.');
expect(str_contains($pluginSource, "'rating-summary',"), 'Flow must register the standalone rating summary block.');
expect(str_contains($widgetSource, "\$atts['id'] = \$all['pattern'];"), 'Flow Elementor widgets must pass their pattern as shortcode ID.');
expect(str_contains($widgetSource, "smartcloud_flow_do_shortcode('smartcloud-flow-form'"), 'Flow form Elementor widget must retain its shortcode adapter.');
expect(str_contains($widgetSource, "smartcloud_flow_do_shortcode('smartcloud-flow-content-root'"), 'Flow content-root Elementor widget must retain its shortcode adapter.');

fwrite(STDOUT, "Flow fallback, shortcode and Elementor compatibility checks passed.\n");
