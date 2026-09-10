<?php

declare(strict_types=1);

namespace SmartCloud\WPSuite\Hub\Abilities {
    abstract class Product_Provider_Base
    {
        protected string $provider_id = 'smartcloud-flow';
        protected string $contract_version = '1.1.0';

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

        protected function block_attributes(string $pluginPath, string $blockName): array
        {
            return array();
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

    function sanitize_key(string $value): string
    {
        return strtolower(preg_replace('/[^a-z0-9_-]/', '', $value) ?? '');
    }

    $reflection = new \ReflectionClass(Provider::class);
    $provider = $reflection->newInstanceWithoutConstructor();
    $reflection->getProperty('plugin_path')->setValue($provider, dirname(__DIR__) . '/');
    $validateNodes = $reflection->getMethod('validate_nodes');

    $fieldTypeBlocks = $reflection->getProperty('field_type_blocks')->getValue($provider);
    $contentBlocks = $reflection->getProperty('content_blocks')->getValue($provider);
    foreach (array('group', 'stack', 'grid') as $containerType) {
        $canonicalName = 'smartcloud-flow/' . $containerType;
        expect(
            ($fieldTypeBlocks[$containerType] ?? '') === $canonicalName,
            $containerType . ' must materialize the registered Flow container block name.'
        );
        expect(
            in_array($canonicalName, $contentBlocks, true),
            $canonicalName . ' must remain valid inside a Flow content root.'
        );
        expect(
            !in_array($canonicalName . '-field', $fieldTypeBlocks, true)
                && !in_array($canonicalName . '-field', $contentBlocks, true),
            $containerType . '-field must not remain in the Flow provider contract.'
        );
    }

    $containerTree = array(
        array(
            'blockName' => 'smartcloud-flow/content-root',
            'attrs' => array(),
            'innerBlocks' => array(
                array(
                    'blockName' => 'smartcloud-flow/group',
                    'attrs' => array(),
                    'innerBlocks' => array(
                        array(
                            'blockName' => 'smartcloud-flow/stack',
                            'attrs' => array(),
                            'innerBlocks' => array(
                                array('blockName' => 'smartcloud-flow/grid', 'attrs' => array(), 'innerBlocks' => array()),
                            ),
                        ),
                    ),
                ),
            ),
        ),
    );
    $containerErrors = array();
    $containerFields = array();
    $containerArgs = array($containerTree, '', null, null, false, &$containerErrors, &$containerFields);
    $validateNodes->invokeArgs($provider, $containerArgs);
    expect($containerErrors === array(), 'Registered Flow group, stack, and grid blocks must validate in a content-root hierarchy.');

    $successTree = array(
        array(
            'blockName' => 'smartcloud-flow/form',
            'attrs' => array(),
            'innerBlocks' => array(
                array(
                    'blockName' => 'smartcloud-flow/success-state',
                    'attrs' => array('trigger' => 'submit-success'),
                    'innerBlocks' => array(
                        array('blockName' => 'core/heading', 'attrs' => array(), 'innerBlocks' => array()),
                        array('blockName' => 'core/paragraph', 'attrs' => array(), 'innerBlocks' => array()),
                        array(
                            'blockName' => 'core/buttons',
                            'attrs' => array(),
                            'innerBlocks' => array(
                                array('blockName' => 'core/button', 'attrs' => array(), 'innerBlocks' => array()),
                            ),
                        ),
                    ),
                ),
            ),
        ),
    );
    $successErrors = array();
    $successFields = array();
    $successArgs = array($successTree, '', null, null, false, &$successErrors, &$successFields);
    $validateNodes->invokeArgs($provider, $successArgs);
    expect($successErrors === array(), 'A success state must accept canonical Heading, Paragraph, Buttons, and Button children.');

    $successContentBlocks = array('core/heading', 'core/paragraph', 'core/buttons', 'core/button');
    $components = $provider->list_components();
    $listedSuccessState = array_values(array_filter(
        $components['components'],
        static fn(array $component): bool => ($component['id'] ?? '') === 'success-state'
    ))[0] ?? array();
    foreach ($successContentBlocks as $coreBlock) {
        expect(
            in_array($coreBlock, $listedSuccessState['block_names'] ?? array(), true),
            $coreBlock . ' must be declared by the success-state component listing.'
        );
    }
    foreach (array('success-state', 'form') as $componentName) {
        $componentSchema = $provider->get_component_schema(array('component' => $componentName));
        foreach ($successContentBlocks as $coreBlock) {
            expect(
                in_array($coreBlock, $componentSchema['block_contract']['block_names'] ?? array(), true),
                $componentName . ' schema must declare its nested ' . $coreBlock . ' contract.'
            );
        }
    }

    $invalidSuccessChildren = array(
        array('blockName' => 'core/button', 'attrs' => array(), 'innerBlocks' => array()),
        array('blockName' => 'core/buttons', 'attrs' => array(), 'innerBlocks' => array()),
    );
    $invalidSuccessErrors = array();
    $invalidSuccessFields = array();
    $invalidSuccessArgs = array(
        $invalidSuccessChildren,
        '',
        'smartcloud-flow/success-state',
        'smartcloud-flow/form',
        false,
        &$invalidSuccessErrors,
        &$invalidSuccessFields,
    );
    $validateNodes->invokeArgs($provider, $invalidSuccessArgs);
    $invalidSuccessCodes = array_column($invalidSuccessErrors, 'code');
    expect(
        in_array('smartcloud_flow_success_content_parent_invalid', $invalidSuccessCodes, true),
        'A Button must remain inside a Buttons block under the success state.'
    );
    expect(
        in_array('smartcloud_flow_success_actions_empty', $invalidSuccessCodes, true),
        'An empty success-state Buttons block must be rejected.'
    );
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
    foreach (array('SMARTCLOUD_WPSUITE_VERSION', 'SMARTCLOUD_WPSUITE_PATH', 'SMARTCLOUD_WPSUITE_URL', 'SMARTCLOUD_WPSUITE_READY_HOOK') as $sharedConstant) {
        expect(str_contains($loaderSource, "if (!defined('{$sharedConstant}'))"), "Flow must guard the shared {$sharedConstant} declaration when another Hub owner already loaded it.");
    }
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
