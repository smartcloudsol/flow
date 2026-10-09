<?php
namespace SmartCloud\WPSuite\Flow;

if (!defined('ABSPATH')) { exit; }

/** Bounded Gutenberg usage, including published synchronized patterns. No permission-dependent cache. */
final class PlacementInspection
{
    private const CACHE_KEY = 'flow_block_placement_v1';
    private const BLOCKS = array('form', 'discussion', 'modal', 'gallery', 'content-root', 'rating-field', 'rating-summary');
    private static bool $hooksRegistered = false;

    public static function registerHooks(): void
    {
        if (self::$hooksRegistered) { return; }
        self::$hooksRegistered = true;
        add_action('save_post', array(self::class, 'invalidate'), 10, 2);
        add_action('deleted_post', array(self::class, 'invalidate'), 10, 2);
    }

    public static function invalidate(int $id, object $post): void
    {
        if (in_array($post->post_type, array('page', 'post', 'wp_block'), true)) { delete_transient(self::CACHE_KEY); }
    }

    public static function usage(): array
    {
        $cached = get_transient(self::CACHE_KEY);
        if (is_array($cached) && isset($cached['matches'], $cached['partial'], $cached['inspected'])) { return $cached; }
        $ids = get_posts(array('post_type' => array('page', 'post'), 'post_status' => 'publish', 'fields' => 'ids', 'posts_per_page' => 201, 'orderby' => 'ID', 'order' => 'ASC', 'no_found_rows' => true, 'suppress_filters' => true));
        $result = array('matches' => array_fill_keys(self::BLOCKS, array()), 'partial' => count($ids) > 200, 'inspected' => 0);
        $budget = array('nodes' => 4000, 'bytes' => 2097152);
        $references = array();
        foreach (array_slice($ids, 0, 200) as $id) {
            if ($budget['nodes'] <= 0 || $budget['bytes'] <= 0) { $result['partial'] = true; break; }
            $post = get_post((int) $id);
            if (!$post || !in_array($post->post_type, array('page', 'post'), true) || $post->post_status !== 'publish') { $result['partial'] = true; continue; }
            $found = array();
            self::content((string) $post->post_content, $budget, $references, array(), 0, $found, $result['partial']);
            $result['inspected']++;
            foreach (array_keys($found) as $kind) { $result['matches'][$kind][] = (int) $post->ID; }
        }
        set_transient(self::CACHE_KEY, $result, 300);
        return $result;
    }

    private static function content(string $content, array &$budget, array &$references, array $ancestors, int $depth, array &$found, bool &$partial): void
    {
        if (strlen($content) > $budget['bytes'] || $depth > 8) { $partial = true; return; }
        $budget['bytes'] -= strlen($content);
        self::blocks(parse_blocks($content), $budget, $references, $ancestors, $depth, $found, $partial);
    }

    private static function blocks(array $blocks, array &$budget, array &$references, array $ancestors, int $depth, array &$found, bool &$partial): void
    {
        foreach ($blocks as $block) {
            if (--$budget['nodes'] < 0 || $depth > 8) { $partial = true; return; }
            $name = (string) ($block['blockName'] ?? '');
            $kind = str_starts_with($name, 'smartcloud-flow/') ? substr($name, strlen('smartcloud-flow/')) : '';
            if (in_array($kind, self::BLOCKS, true)) { $found[$kind] = true; }
            if ($name === 'core/block') {
                $id = (int) ($block['attrs']['ref'] ?? 0);
                if ($id <= 0 || isset($ancestors[$id])) { $partial = true; continue; }
                if (!array_key_exists($id, $references)) { $references[$id] = get_post($id); }
                $reference = $references[$id];
                if (!$reference || $reference->post_type !== 'wp_block' || $reference->post_status !== 'publish') { $partial = true; continue; }
                self::content((string) $reference->post_content, $budget, $references, $ancestors + array($id => true), $depth + 1, $found, $partial);
            }
            if (!empty($block['innerBlocks'])) { self::blocks($block['innerBlocks'], $budget, $references, $ancestors, $depth + 1, $found, $partial); }
        }
    }
}
