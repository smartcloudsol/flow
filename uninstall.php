<?php
/**
 * SmartCloud Flow uninstall cleanup.
 */

if (!defined('WP_UNINSTALL_PLUGIN')) {
    exit;
}

function smartcloud_flow_uninstall_site(): void
{
    delete_option('smartcloud-flow');

    foreach (array(
        'workflows_backend_form_id',
        'workflows_backend_sync_hash',
        'workflows_backend_sync_status',
        'workflows_backend_last_synced_at',
        'workflows_backend_last_error',
        'workflows_backend_source_kind',
    ) as $meta_key) {
        delete_post_meta_by_key($meta_key);
    }
}

if (is_multisite()) {
    foreach (get_sites(array('fields' => 'ids', 'number' => 0)) as $smartcloud_flow_site_id) {
        switch_to_blog((int) $smartcloud_flow_site_id);
        smartcloud_flow_uninstall_site();
        restore_current_blog();
    }
} else {
    smartcloud_flow_uninstall_site();
}
