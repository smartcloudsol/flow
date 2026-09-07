<?php

declare(strict_types=1);

namespace SmartCloud\WPSuite\Hub\Abilities {
    abstract class Product_Provider_Base
    {
        public function __construct(...$args)
        {
        }

        public function bootstrap(): void
        {
        }

        protected function validation_issue(string $code, string $message, string $path): array
        {
            return compact('code', 'message', 'path');
        }
    }
}

namespace SmartCloud\WPSuite\Flow\Abilities {
    define('ABSPATH', __DIR__ . '/');

    require_once dirname(__DIR__) . '/includes/abilities-provider.php';

    function expect(bool $condition, string $message): void
    {
        if (!$condition) {
            fwrite(STDERR, $message . PHP_EOL);
            exit(1);
        }
    }

    $reflection = new \ReflectionClass(Provider::class);
    $provider = $reflection->newInstanceWithoutConstructor();
    $validateNodes = $reflection->getMethod('validate_nodes');
    $fallback = array(
        'blockName' => 'wpsuite/react-fallback',
        'attrs' => array(),
        'innerBlocks' => array(array('blockName' => 'core/paragraph', 'attrs' => array())),
    );

    foreach (array('smartcloud-flow/form', 'smartcloud-flow/content-root') as $parent) {
        $errors = array();
        $fields = array();
        $args = array(array($fallback), '', $parent, $parent, false, &$errors, &$fields);
        $validateNodes->invokeArgs($provider, $args);
        expect($errors === array(), $parent . ' must accept a direct React fallback and its native Gutenberg children.');
    }

    $invalidErrors = array();
    $fields = array();
    $invalidArgs = array(array($fallback), '', null, null, false, &$invalidErrors, &$fields);
    $validateNodes->invokeArgs($provider, $invalidArgs);
    expect(($invalidErrors[0]['code'] ?? '') === 'smartcloud_flow_fallback_parent_invalid', 'React fallback must remain restricted to supported Flow roots.');

    $pluginSource = file_get_contents(dirname(__DIR__) . '/smartcloud-flow.php');
    $loaderSource = file_get_contents(dirname(__DIR__) . '/hub-loader.php');
    expect(is_string($pluginSource) && is_string($loaderSource), 'Flow runtime contract sources must be readable.');
    expect(str_contains($pluginSource, "smartcloud-wpsuite/abilities.php"), 'Flow must load Abilities from the renamed runtime directory.');
    expect(str_contains($loaderSource, "SMARTCLOUD_WPSUITE_RUNTIME_DIRECTORY"), 'Flow Hub loader must separate the runtime directory from stable identifiers.');
    expect(str_contains($loaderSource, "'smartcloud-wpsuite'"), 'Flow Hub loader must target the renamed runtime directory.');
    expect(str_contains($loaderSource, "'hub-for-wpsuiteio'"), 'Flow must retain the legacy WP Suite slug alias during migration.');
    $uninstallSource = file_get_contents(dirname(__DIR__) . '/uninstall.php');
    expect(is_string($uninstallSource), 'Flow uninstall cleanup must be packaged.');
    expect(str_contains($uninstallSource, 'workflows_backend_source_kind'), 'Flow uninstall must remove all backend-sync metadata.');
    expect(!str_contains($uninstallSource, 'smartcloud-wpsuiteio/license-jws'), 'Flow uninstall must not remove shared WP Suite licences.');

    $flowPayload = $reflection->getMethod('flow_payload');
    foreach (array('text', 'submit') as $type) {
        $payload = $flowPayload->invoke(
            $provider,
            $type,
            array(
                'name' => $type === 'submit' ? 'submit' : 'email',
                'conditionalLogic' => array(
                    'enabled' => false,
                    'logicType' => 'all',
                    'rules' => array(),
                ),
            )
        );
        expect(
            !array_key_exists('conditionalLogic', $payload),
            $type . ' payload must omit inactive empty conditional logic to match the Gutenberg save contract.'
        );
    }

    $activePayload = $flowPayload->invoke(
        $provider,
        'text',
        array(
            'conditionalLogic' => array(
                'enabled' => true,
                'logicType' => 'all',
                'rules' => array(array('field' => 'plan', 'operator' => 'equals', 'value' => 'pro')),
            ),
        )
    );
    expect(
        array_key_exists('conditionalLogic', $activePayload),
        'Active conditional logic must remain in the serialized Flow payload.'
    );

    fwrite(STDOUT, "Flow abilities fallback and runtime compatibility checks passed.\n");
}
