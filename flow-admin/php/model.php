<?php
/**
 * Simple PHP representation of the settings edited on the WP admin screen.
 *
 * Mirrors the shape of `FlowAdminSettings` used in the admin React app.
 */

namespace SmartCloud\WPSuite\Flow;

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly.
}

class FlowAdminSettings
{
    private const ALLOWED_HIGHLIGHTED_SUBMISSION_ACTIONS = ['seen', 'resolved', 'completed'];

    public function __construct(
        public bool $enablePoweredBy = false,
        public string $defaultOutputLanguage = "",
        public bool $debugLoggingEnabled = false,
        public bool $formsBackendSyncEnabled = true,
        public bool $formsAllowPermanentDelete = false,
        public array $highlightedSubmissionActions = ['seen', 'resolved', 'completed'],
    ) {
    }

    private static function normalizeHighlightedSubmissionActions(mixed $raw): array
    {
        if (!is_array($raw)) {
            return self::ALLOWED_HIGHLIGHTED_SUBMISSION_ACTIONS;
        }

        $normalized = array_values(array_intersect(
            self::ALLOWED_HIGHLIGHTED_SUBMISSION_ACTIONS,
            array_map('strval', $raw)
        ));

        return !empty($normalized)
            ? $normalized
            : self::ALLOWED_HIGHLIGHTED_SUBMISSION_ACTIONS;
    }

    /**
     * Normalizes WP option payloads (array/object/Settings/FlowAdminSettings) to a typed instance.
     */
    public static function fromMixed(mixed $raw): self
    {
        if ($raw instanceof self) {
            return $raw;
        }
        // Backward compatible: older class name.
        if ($raw instanceof Settings) {
            return new self(
                enablePoweredBy: (bool) ($raw->enablePoweredBy ?? false),
                defaultOutputLanguage: (string) ($raw->defaultOutputLanguage ?? ""),
                debugLoggingEnabled: (bool) ($raw->debugLoggingEnabled ?? false),
                formsBackendSyncEnabled: (bool) ($raw->formsBackendSyncEnabled ?? true),
                formsAllowPermanentDelete: (bool) ($raw->formsAllowPermanentDelete ?? false),
                highlightedSubmissionActions: self::normalizeHighlightedSubmissionActions($raw->highlightedSubmissionActions ?? null),
            );
        }

        // WP may return associative array, stdClass, or anything else.
        $arr = [];
        if (is_array($raw)) {
            $arr = $raw;
        } elseif (is_object($raw)) {
            $arr = get_object_vars($raw);
        }

        return new self(
            enablePoweredBy: (bool) ($arr['enablePoweredBy'] ?? false),
            defaultOutputLanguage: (string) ($arr['defaultOutputLanguage'] ?? ""),
            debugLoggingEnabled: (bool) ($arr['debugLoggingEnabled'] ?? false),
            formsBackendSyncEnabled: (bool) ($arr['formsBackendSyncEnabled'] ?? true),
            formsAllowPermanentDelete: (bool) ($arr['formsAllowPermanentDelete'] ?? false),
            highlightedSubmissionActions: self::normalizeHighlightedSubmissionActions($arr['highlightedSubmissionActions'] ?? null),
        );
    }
}

/**
 * @deprecated Use FlowAdminSettings. Kept as a thin alias to avoid breaking older code.
 */
class Settings extends FlowAdminSettings
{
}
