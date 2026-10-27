<?php
declare(strict_types=1);

namespace SmartCloud\WPSuite\Flow {
    final class Logger { public static function debug(...$args): void {} public static function info(...$args): void {} public static function warning(...$args): void {} }
}
namespace {
    define('ABSPATH', __DIR__ . '/');
    $profile = null; $meta = []; $checks = 0;
    function apply_filters(string $hook, mixed $value): mixed { return $hook === 'smartcloud_wpsuite_backend_profile_context' ? $GLOBALS['profile'] : $value; }
    function get_post_meta(int $id, string $key, bool $single): mixed { return $GLOBALS['meta'][$id][$key] ?? ''; }
    function update_post_meta(int $id, string $key, mixed $value): bool { $GLOBALS['meta'][$id][$key] = $value; return true; }
    function delete_post_meta(int $id, string $key): bool { unset($GLOBALS['meta'][$id][$key]); return true; }
    function check(bool $value, string $message): void { $GLOBALS['checks']++; if (!$value) throw new RuntimeException($message); }
    require __DIR__ . '/../admin/php/form-sync-meta.php';
    use SmartCloud\WPSuite\Flow\FormSyncMeta;
    use SmartCloud\WPSuite\Flow\BackendProfileState;

    FormSyncMeta::setFormId(10, 'existing-development-form');
    FormSyncMeta::setSyncHash(10, 'same-content-hash');
    FormSyncMeta::setSyncStatus(10, 'synced');
    $original = $meta;
    $profile = ['enabled' => true, 'id' => 'development', 'namespace' => '', 'bindingRevision' => 1, 'legacyStateOwner' => 'development'];
    check(FormSyncMeta::getFormId(10) === 'existing-development-form', 'Original state owner must preserve existing form identity.');
    $profile = ['enabled' => true, 'id' => 'production', 'namespace' => 'production', 'bindingRevision' => 2, 'legacyStateOwner' => 'development'];
    check(FormSyncMeta::getFormId(10) === null, 'Another backend must not reuse the original form ID.');
    check(FormSyncMeta::getSyncStatus(10) === null && FormSyncMeta::getSyncHash(10) === null, 'Equal content must not falsely skip sync against an empty backend.');
    FormSyncMeta::setFormId(10, 'production-form');
    FormSyncMeta::setSyncHash(10, 'same-content-hash');
    FormSyncMeta::setSyncStatus(10, 'synced');
    FormSyncMeta::setLastSynced(10, '2026-10-27T00:00:00Z');
    FormSyncMeta::setLastError(10, 'fixture-only');
    FormSyncMeta::setSourceKind(10, 'pattern');
    check(FormSyncMeta::getAllSyncMeta(10)['backendProfile'] === ['id' => 'production', 'bindingRevision' => 2], 'Editor sync response must identify its backend binding.');
    check($meta[10]['workflows_backend_form_id'] === 'existing-development-form', 'Production writes must preserve development state.');
    check(FormSyncMeta::withRenderSource(10, fn() => FormSyncMeta::getFormId(99)) === 'production-form', 'Shortcode rendering in another post must resolve its source pattern.');
    check(FormSyncMeta::getFormId(99) === null, 'Render source override must not escape its call.');
    try { FormSyncMeta::withRenderSource(10, fn() => throw new RuntimeException('fixture')); } catch (RuntimeException $error) {}
    check(FormSyncMeta::getFormId(99) === null, 'A failed render must restore prior source context.');
    FormSyncMeta::clearAllSyncMeta(10);
    check($meta === $original, 'Clearing the active profile must leave the original six meta keys exact.');
    check(BackendProfileState::optionName('smartcloud-flow') === 'wpsuite-profile/production/smartcloud-flow', 'Local product preferences require profile storage.');
    $profile['namespace'] = '../invalid';
    $rejected = false; try { BackendProfileState::metaKey('fixture'); } catch (RuntimeException $error) { $rejected = true; }
    check($rejected, 'Malformed enabled context must fail before reading another profile.');
    $profile = null;
    check(BackendProfileState::optionName('smartcloud-flow') === 'smartcloud-flow', 'Ordinary installations must keep exact legacy option names.');
    check(!isset(FormSyncMeta::getAllSyncMeta(10)['backendProfile']), 'Ordinary installations retain the original metadata response.');
    echo "Flow backend profile isolation: {$checks} checks PASS\n";
}
