<?php
namespace SmartCloud\WPSuite\Flow;

if (!defined('ABSPATH')) { exit; }

final class BackendProfileState
{
    public static function context(): ?array
    {
        $context = function_exists('apply_filters') ? apply_filters('smartcloud_wpsuite_backend_profile_context', null) : null;
        if (!is_array($context) || ($context['enabled'] ?? false) !== true) return null;
        if (!is_int($context['bindingRevision'] ?? null) || $context['bindingRevision'] < 1
            || !in_array($context['id'] ?? '', ['production', 'development'], true)
            || !in_array($context['namespace'] ?? null, ['', 'production', 'development'], true)
            || ($context['namespace'] !== '' && $context['namespace'] !== $context['id'])) {
            throw new \RuntimeException('Invalid backend profile context.');
        }
        if (isset($context['stateNamespace']) && $context['stateNamespace'] !== $context['id'] . '/bindings/' . $context['bindingRevision']) throw new \RuntimeException('Invalid backend state namespace.');
        return $context;
    }

    public static function optionName(string $name): string
    {
        $context = self::context();
        return $context === null || $context['namespace'] === '' ? $name : 'wpsuite-profile/' . ($context['stateNamespace'] ?? $context['id']) . '/' . $name;
    }

    public static function metaKey(string $key): string
    {
        $context = self::context();
        return $context === null || $context['namespace'] === '' ? $key : $key . '__wpsuite_' . $context['id'] . (isset($context['stateNamespace']) ? '_binding_' . $context['bindingRevision'] : '');
    }
}
