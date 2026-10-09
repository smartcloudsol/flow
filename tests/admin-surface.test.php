<?php
declare(strict_types=1);
define('ABSPATH', __DIR__ . '/');
define('SMARTCLOUD_FLOW_SLUG', 'smartcloud-flow');
$options = []; $writes = []; $allowed = true; $checks = 0; $deniedCapabilities = [];
function __(string $text, string $domain = ''): string { return $text; }
function current_user_can(string $cap): bool { return $GLOBALS['allowed'] && !in_array($cap, $GLOBALS['deniedCapabilities'], true); }
function get_option(string $key, mixed $default = false): mixed { return array_key_exists($key, $GLOBALS['options']) ? $GLOBALS['options'][$key] : $default; }
function update_option(string $key, mixed $value): bool { $GLOBALS['options'][$key] = $value; $GLOBALS['writes'][] = $key; return true; }
function admin_url(string $path): string { return 'https://example.test/wp-admin/' . $path; }
function get_transient(string $key): mixed { return false; }
function set_transient(string $key, mixed $value, int $expiry): bool { return true; }
function get_posts(array $args): array { return []; }
class WP_Error { public function __construct(public string $code, public string $message, public array $data) {} }
function check(bool $condition, string $message): void { $GLOBALS['checks']++; if (!$condition) { throw new RuntimeException($message); } }
require __DIR__ . '/../admin/php/model.php';
require __DIR__ . '/../admin/php/surface.php';
use SmartCloud\WPSuite\Flow\AdminSurface;

$snapshot = AdminSurface::read();
check($snapshot['steps'] === [], 'Flow introduces its actual blocks without an artificial preferences wizard.');
check(!$snapshot['configured'], 'Absent local option starts onboarding without connection.');
check($snapshot['status']['state'] === 'ready' && $snapshot['status']['label'] === 'Flow blocks available' && $snapshot['can_setup'] === false, 'Fresh Flow offers usable blocks without claiming a missing wizard or backend readiness.');
$readBefore = serialize($options); $readWrites = count($writes);
$guidance = AdminSurface::read()['use_on_site'];
check(array_column($guidance['items'], 'id') === ['form', 'discussion', 'rating', 'modal', 'gallery', 'content-root'], 'Existing Form, Discussion, Rating and free Gutenberg surfaces are exposed.');
check(array_column($guidance['items'], 'title') === ['Flow Form', 'Form + Discussion', 'Rating', 'Flow Modal', 'Gallery', 'Flow Content Root'], 'Placement cards identify the supported user experiences.');
check(str_contains($guidance['items'][1]['status'], 'Requires a configured Flow backend') && str_contains($guidance['items'][2]['status'], 'Discussion aggregates require a configured Flow backend'), 'Discussion and aggregate requirements are stated without claiming readiness.');
check(!array_filter($guidance['items'], static fn(array $item): bool => isset($item['status']) && str_contains($item['status'], 'Ready')), 'No frontend usage or operational readiness is invented.');
$formGuidance = $guidance['items'][0];
$help = array_column($snapshot['help'], null, 'id');
$formHelp = implode(' ', $help[$formGuidance['help_id']]['paragraphs']);
check(str_contains($formHelp, 'Endpoint path') && str_contains($formHelp, 'HTTPS') && str_contains($formHelp, 'CORS') && str_contains($formHelp, 'return JSON') && str_contains($formHelp, 'never place secrets'), 'Own endpoint help preserves browser transport and secret guidance.');
check(strlen($formGuidance['description']) < 150 && !str_contains($formGuidance['description'], 'CORS'), 'Protocol detail moves into contextual help instead of permanent card copy.');
$ratingHelp = implode(' ', $help['rating-placement']['paragraphs']);
check(str_contains($ratingHelp, 'inside Flow Form') && str_contains($ratingHelp, 'Flow Rating Summary') && str_contains($ratingHelp, 'root comments, not replies') && str_contains($ratingHelp, 'reconciliation'), 'Rating help follows actual field placement, aggregate, reply and migration semantics.');
check(str_contains(implode(' ', $help['discussion-placement']['paragraphs']), 'same synchronized Form ID and content target'), 'Discussion help describes the actual assignment contract.');
check(count($help) === count($snapshot['help']) && count($help) <= 32, 'Help identifiers are unique and bounded.');
foreach (array_merge($snapshot['metrics'], $guidance['items'], $snapshot['steps'], ...array_column($snapshot['steps'], 'fields')) as $item) {
    check(isset($help[$item['help_id']]), 'Every contextual help reference resolves to a declared topic.');
}
check($snapshot['actions'] === [] && !str_contains(serialize($snapshot), 'Start Flow Evaluation'), 'Guidance adds no provisioning, content writes or deferred evaluation actions.');
check(!array_filter($formGuidance['links'], static fn(array $link): bool => str_contains($link['url'], 'section=api-settings')), 'Own endpoint guidance never points to unrelated Pro API configuration.');
check(serialize($options) === $readBefore && count($writes) === $readWrites, 'Reading placement guidance writes no settings, backend configuration or content.');
check(count($snapshot['links']) === 3 && !array_filter($snapshot['links'], static fn(array $link): bool => str_contains($link['url'], 'post-new.php') || str_contains($link['url'], 'post_type=wp_block')), 'Placement links move into their cards while the technical footer remains focused.');
$deniedCapabilities = ['edit_pages'];
$restrictedGuidance = AdminSurface::read()['use_on_site'];
foreach ($restrictedGuidance['items'] as $item) {
    check(!array_filter($item['links'], static fn(array $link): bool => str_contains($link['url'], 'post_type=page')), 'Page editor links require edit_pages independently of manage_options.');
}
check(count($restrictedGuidance['items'][0]['links']) === 1, 'Pattern link remains when edit_posts is allowed.');
$deniedCapabilities = ['edit_posts'];
$restrictedGuidance = AdminSurface::read()['use_on_site'];
check(count($restrictedGuidance['items'][0]['links']) === 0 && !array_filter($restrictedGuidance['items'][0]['links'], static fn(array $link): bool => str_contains($link['url'], 'post_type=wp_block')), 'Patterns require edit_posts; redundant generic page actions stay absent.');
$deniedCapabilities = ['edit_posts', 'edit_pages'];
foreach (AdminSurface::read()['use_on_site']['items'] as $item) check($item['links'] === [], 'Read-only administrator sees guidance without unauthorized editor links.');
$deniedCapabilities = [];
foreach ([[], new stdClass(), null, '', 'legacy', ['debugLoggingEnabled' => true], ['enablePoweredBy' => null], ['enablePoweredBy' => 'false']] as $empty) {
    $options['smartcloud-flow'] = $empty;
    check(!AdminSurface::read()['configured'], 'Empty, invalid or unrelated settings retain onboarding.');
    check(AdminSurface::read()['status']['state'] === 'ready' && AdminSurface::read()['can_setup'] === false, 'Missing preferences never require an unavailable setup wizard.');
}
foreach ([['enablePoweredBy' => false], (object) ['formsBackendSyncEnabled' => false]] as $saved) {
    $options['smartcloud-flow'] = $saved;
    check(AdminSurface::read()['configured'], 'Saved false preference completes onboarding for array and object storage.');
    check(AdminSurface::read()['status']['label'] === 'Form preferences configured', 'Saved preferences do not imply a connected or verified backend.');
}
unset($options['smartcloud-flow']);
$result = AdminSurface::save(['enablePoweredBy' => false], $snapshot['revision']);
check(is_array($result) && $result['configured'], 'Saving default values completes local preferences.');
$options['smartcloud-flow'] = ['debugLoggingEnabled' => true, 'formsAllowPermanentDelete' => true, 'highlightedSubmissionActions' => ['resolved'], 'defaultOutputLanguage' => 'de', 'futureField' => ['keep' => true]];
$options['pro'] = ['backendBaseUrl' => 'https://backend.example.test'];
$before = $options['smartcloud-flow']; $snapshot = AdminSurface::read();
$result = AdminSurface::save(['enablePoweredBy' => true, 'formsBackendSyncEnabled' => false], $snapshot['revision']);
check(is_array($result), 'Local preferences save.');
check($options['smartcloud-flow'] === array_merge($before, ['enablePoweredBy' => true, 'formsBackendSyncEnabled' => false]), 'Every unedited advanced and future field survives.');
$options['smartcloud-flow']['futureField']['keep'] = false;
$error = AdminSurface::save(['enablePoweredBy' => false], $result['revision']);
check($error instanceof WP_Error && $error->data['status'] === 409, 'Concurrent Advanced update conflicts.');
$revision = AdminSurface::read()['revision'];
foreach ([['enablePoweredBy' => 'false'], ['formsAllowPermanentDelete' => false], ['backendBaseUrl' => 'https://other.test'], []] as $invalid) {
    $before = serialize($options); $count = count($writes);
    check(AdminSurface::save($invalid, $revision) instanceof WP_Error, 'Unsupported or invalid patch rejected.');
    check(serialize($options) === $before && count($writes) === $count, 'Invalid patch causes no writes.');
}
check(array_unique($writes) === ['smartcloud-flow'], 'No Pro or shared option is written.');
$allowed = false;
check(AdminSurface::read() instanceof WP_Error, 'Permission enforced on read.');
check(AdminSurface::save(['enablePoweredBy' => true], $revision) instanceof WP_Error, 'Permission enforced on save.');
echo "Flow admin surface: {$checks} checks passed.\n";
