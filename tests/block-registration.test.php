<?php

declare(strict_types=1);

$repository = dirname(__DIR__);
$pluginSource = (string) file_get_contents($repository . '/smartcloud-flow.php');
$editorSource = (string) file_get_contents($repository . '/blocks/src/editor.tsx');
$providerSource = (string) file_get_contents($repository . '/includes/abilities-provider.php');
$builtDirectory = null;

foreach (array_slice($argv, 1) as $argument) {
    if (str_starts_with($argument, '--built-dir=')) {
        $builtDirectory = substr($argument, strlen('--built-dir='));
    }
}

function expect(bool $condition, string $message): void
{
    if (!$condition) {
        fwrite(STDERR, $message . PHP_EOL);
        exit(1);
    }
}

expect(
    preg_match('/private array \\$blocks = \\[(.*?)\\n    \\];/s', $pluginSource, $matches) === 1,
    'Could not read Flow::$blocks from smartcloud-flow.php.'
);

preg_match_all("/'([^']+)'/", $matches[1], $registeredMatches);
$registeredBlocks = $registeredMatches[1];
$promotedBlocks = array(
    'checkbox-group-field' => array(
        'name' => 'smartcloud-flow/checkbox-group-field',
        'runtime_type' => 'checkbox-group',
    ),
    'hidden-field' => array(
        'name' => 'smartcloud-flow/hidden-field',
        'runtime_type' => 'hidden',
    ),
);

foreach ($promotedBlocks as $directory => $contract) {
    expect(
        in_array($directory, $registeredBlocks, true),
        $directory . ' must remain in Flow::$blocks.'
    );

    $sourceDirectory = $repository . '/blocks/src/' . $directory;
    foreach (array('block.json', 'index.tsx', 'edit.tsx', 'save.tsx') as $requiredFile) {
        expect(
            is_file($sourceDirectory . '/' . $requiredFile),
            $directory . ' is missing required source file ' . $requiredFile . '.'
        );
    }

    $metadata = json_decode((string) file_get_contents($sourceDirectory . '/block.json'), true);
    expect(is_array($metadata), $directory . '/block.json must contain valid JSON.');
    expect(
        ($metadata['name'] ?? null) === $contract['name'],
        $directory . '/block.json must declare ' . $contract['name'] . '.'
    );
    expect(
        ($metadata['editorScript'] ?? null) === 'smartcloud-flow-blocks-editor-script',
        $directory . '/block.json must use the shipped Flow editor script.'
    );
    expect(
        str_contains($editorSource, 'import "./' . $directory . '/index";'),
        $directory . ' must remain imported by the editor entry point.'
    );
    expect(
        str_contains($providerSource, "'" . $contract['runtime_type'] . "' => '" . $contract['name'] . "'"),
        $directory . ' must remain mapped by the Composer abilities provider.'
    );

    if ($builtDirectory !== null) {
        $builtMetadataPath = rtrim($builtDirectory, '/') . '/' . $directory . '/block.json';
        expect(is_file($builtMetadataPath), $directory . ' metadata is missing from the WordPress build.');
        $builtMetadata = json_decode((string) file_get_contents($builtMetadataPath), true);
        expect(is_array($builtMetadata), $builtMetadataPath . ' must contain valid JSON.');
        expect(
            ($builtMetadata['name'] ?? null) === $contract['name'],
            $builtMetadataPath . ' must retain the source block name.'
        );
    }
}

fwrite(STDOUT, "Flow promoted block registration and package checks passed.\n");
