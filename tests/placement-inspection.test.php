<?php
declare(strict_types=1);
define('ABSPATH', __DIR__);
$checks = 0; $cache = []; $posts = []; $queries = 0; $hooks = [];
function check(bool $condition, string $message): void { $GLOBALS['checks']++; if (!$condition) throw new RuntimeException($message); }
function add_action(string $hook, callable $cb, int $priority, int $args): void { $GLOBALS['hooks'][] = $hook; }
function get_transient(string $key): mixed { return $GLOBALS['cache'][$key] ?? false; }
function set_transient(string $key, mixed $value, int $seconds): bool { check($seconds === 300, 'Cache has bounded lifetime.'); $GLOBALS['cache'][$key] = $value; return true; }
function delete_transient(string $key): bool { unset($GLOBALS['cache'][$key]); return true; }
function get_posts(array $args): array {
    $GLOBALS['queries']++;
    check($args['posts_per_page'] === 201 && $args['post_status'] === 'publish' && $args['post_type'] === ['page', 'post'], 'Discovery remains bounded and scoped to published pages/posts.');
    return array_slice(array_keys(array_filter($GLOBALS['posts'], fn($p) => in_array($p->post_type, ['page', 'post']) && $p->post_status === 'publish')), 0, 201);
}
function get_post(int $id): ?object { return $GLOBALS['posts'][$id] ?? null; }
function parse_blocks(string $content): array { return json_decode($content, true) ?? []; }
function post(int $id, array $blocks, string $type = 'page', string $status = 'publish'): object { return (object) ['ID' => $id, 'post_type' => $type, 'post_status' => $status, 'post_content' => json_encode($blocks)]; }
function block(string $name, array $inner = [], array $attrs = []): array { return ['blockName' => $name, 'innerBlocks' => $inner, 'attrs' => $attrs]; }
require __DIR__ . '/../admin/php/placement-inspection.php';
use SmartCloud\WPSuite\Flow\PlacementInspection;
PlacementInspection::registerHooks(); PlacementInspection::registerHooks();
check($hooks === ['save_post', 'deleted_post'], 'Cache invalidation hooks register once.');
$posts = [
    1 => post(1, [block('smartcloud-flow/form'), block('smartcloud-flow/form'), block('core/group', [block('smartcloud-flow/gallery')])]),
    2 => post(2, [block('core/block', [], ['ref' => 8])], 'post'),
    3 => post(3, [block('smartcloud-flow/modal')], 'page', 'draft'),
    8 => post(8, [block('smartcloud-flow/modal'), block('smartcloud-flow/discussion')], 'wp_block'),
];
$result = PlacementInspection::usage();
check($result['inspected'] === 2 && !$result['partial'], 'Only published pages/posts counted.');
check($result['matches']['form'] === [1], 'Two instances on a page count as one containing page.');
check($result['matches']['gallery'] === [1] && $result['matches']['modal'] === [2] && $result['matches']['discussion'] === [2], 'Nested blocks and published synchronized patterns are inspected.');
check(PlacementInspection::usage() === $result && $queries === 1, 'Subsequent cards reuse one cached scan.');
PlacementInspection::invalidate(99, (object) ['post_type' => 'attachment']); PlacementInspection::usage();
check($queries === 1, 'Unrelated saves retain cache.');
$posts[8] = post(8, [block('smartcloud-flow/content-root'), block('core/block', [], ['ref' => 8])], 'wp_block');
PlacementInspection::invalidate(8, $posts[8]); $result = PlacementInspection::usage();
check($queries === 2 && $result['partial'] && $result['matches']['content-root'] === [2], 'Pattern saves invalidate cache and cycles stop with partial results.');
$posts = [1 => post(1, [block('core/block', [], ['ref' => 999])])]; $cache = [];
check(PlacementInspection::usage()['partial'], 'Missing references are not reported as complete inspection.');
$posts = []; for ($i = 1; $i <= 201; $i++) $posts[$i] = post($i, [block('smartcloud-flow/form')]); $cache = [];
$result = PlacementInspection::usage();
check($result['partial'] && $result['inspected'] === 200 && count($result['matches']['form']) === 200, 'Large sites show truthful partial counts.');
$posts = [1 => post(1, [])]; $posts[1]->post_content = str_repeat('x', 2097153); $cache = [];
check(PlacementInspection::usage()['partial'], 'Oversized content respects aggregate byte budget.');
$posts[1] = post(1, array_fill(0, 4001, block('smartcloud-flow/form'))); $cache = [];
check(PlacementInspection::usage()['partial'], 'Large trees respect aggregate node budget.');
echo "Flow placement inspection: {$checks} checks passed.\n";
