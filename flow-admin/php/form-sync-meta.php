<?php
/**
 * Form Backend Sync Metadata Helpers
 * 
 * Utilities for storing and retrieving backend form sync state in WordPress post meta.
 */

namespace SmartCloud\WPSuite\Flow;

use SmartCloud\WPSuite\Flow\Logger;

if (!defined('ABSPATH')) {
    exit;
}

class FormSyncMeta
{
    // Meta keys for backend sync
    const META_FORM_ID = 'workflows_backend_form_id';
    const META_SYNC_HASH = 'workflows_backend_sync_hash';
    const META_SYNC_STATUS = 'workflows_backend_sync_status';
    const META_LAST_SYNCED = 'workflows_backend_last_synced_at';
    const META_LAST_ERROR = 'workflows_backend_last_error';
    const META_SOURCE_KIND = 'workflows_backend_source_kind';

    /**
     * Get backend formId for a post
     * 
     * @param int $post_id
     * @return string|null
     */
    public static function getFormId(int $post_id): ?string
    {
        $formId = get_post_meta($post_id, self::META_FORM_ID, true);
        return $formId ? (string) $formId : null;
    }

    /**
     * Set backend formId for a post
     * 
     * @param int $post_id
     * @param string $formId
     * @return bool
     */
    public static function setFormId(int $post_id, string $formId): bool
    {
        Logger::debug('Setting form backend sync ID', [
            'post_id' => $post_id,
            'formId' => $formId
        ]);

        return update_post_meta($post_id, self::META_FORM_ID, $formId);
    }

    /**
     * Get sync hash
     * 
     * @param int $post_id
     * @return string|null
     */
    public static function getSyncHash(int $post_id): ?string
    {
        $hash = get_post_meta($post_id, self::META_SYNC_HASH, true);
        return $hash ? (string) $hash : null;
    }

    /**
     * Set sync hash
     * 
     * @param int $post_id
     * @param string $hash
     * @return bool
     */
    public static function setSyncHash(int $post_id, string $hash): bool
    {
        return update_post_meta($post_id, self::META_SYNC_HASH, $hash);
    }

    /**
     * Get sync status
     * 
     * @param int $post_id
     * @return string|null One of: idle, syncing, synced, error
     */
    public static function getSyncStatus(int $post_id): ?string
    {
        $status = get_post_meta($post_id, self::META_SYNC_STATUS, true);
        return $status ? (string) $status : null;
    }

    /**
     * Set sync status
     * 
     * @param int $post_id
     * @param string $status
     * @return bool
     */
    public static function setSyncStatus(int $post_id, string $status): bool
    {
        Logger::debug('Form sync status changed', [
            'post_id' => $post_id,
            'status' => $status
        ]);

        return update_post_meta($post_id, self::META_SYNC_STATUS, $status);
    }

    /**
     * Get last synced timestamp
     * 
     * @param int $post_id
     * @return string|null ISO 8601 timestamp
     */
    public static function getLastSynced(int $post_id): ?string
    {
        $timestamp = get_post_meta($post_id, self::META_LAST_SYNCED, true);
        return $timestamp ? (string) $timestamp : null;
    }

    /**
     * Set last synced timestamp
     * 
     * @param int $post_id
     * @param string $timestamp ISO 8601 timestamp
     * @return bool
     */
    public static function setLastSynced(int $post_id, string $timestamp): bool
    {
        return update_post_meta($post_id, self::META_LAST_SYNCED, $timestamp);
    }

    /**
     * Get last error message
     * 
     * @param int $post_id
     * @return string|null
     */
    public static function getLastError(int $post_id): ?string
    {
        $error = get_post_meta($post_id, self::META_LAST_ERROR, true);
        return $error ? (string) $error : null;
    }

    /**
     * Set last error message
     * 
     * @param int $post_id
     * @param string|null $error
     * @return bool
     */
    public static function setLastError(int $post_id, ?string $error): bool
    {
        if ($error !== null) {
            Logger::warning('Form sync error recorded', [
                'post_id' => $post_id,
                'error' => $error
            ]);
        }

        if ($error === null) {
            return delete_post_meta($post_id, self::META_LAST_ERROR);
        }
        return update_post_meta($post_id, self::META_LAST_ERROR, $error);
    }

    /**
     * Get source kind
     * 
     * @param int $post_id
     * @return string|null One of: post, pattern, reusable_block
     */
    public static function getSourceKind(int $post_id): ?string
    {
        $kind = get_post_meta($post_id, self::META_SOURCE_KIND, true);
        return $kind ? (string) $kind : null;
    }

    /**
     * Set source kind
     * 
     * @param int $post_id
     * @param string $kind
     * @return bool
     */
    public static function setSourceKind(int $post_id, string $kind): bool
    {
        return update_post_meta($post_id, self::META_SOURCE_KIND, $kind);
    }

    /**
     * Get all sync metadata for a post
     * 
     * @param int $post_id
     * @return array
     */
    public static function getAllSyncMeta(int $post_id): array
    {
        return [
            'formId' => self::getFormId($post_id),
            'syncHash' => self::getSyncHash($post_id),
            'syncStatus' => self::getSyncStatus($post_id),
            'lastSynced' => self::getLastSynced($post_id),
            'lastError' => self::getLastError($post_id),
            'sourceKind' => self::getSourceKind($post_id),
        ];
    }

    /**
     * Clear all sync metadata
     * 
     * @param int $post_id
     * @return void
     */
    public static function clearAllSyncMeta(int $post_id): void
    {
        Logger::info('Clearing all form sync metadata', ['post_id' => $post_id]);

        delete_post_meta($post_id, self::META_FORM_ID);
        delete_post_meta($post_id, self::META_SYNC_HASH);
        delete_post_meta($post_id, self::META_SYNC_STATUS);
        delete_post_meta($post_id, self::META_LAST_SYNCED);
        delete_post_meta($post_id, self::META_LAST_ERROR);
        delete_post_meta($post_id, self::META_SOURCE_KIND);
    }
}
