# WP Suite Flow

Flow is a WordPress plugin for building **block-based forms and workflow-driven submission flows** in Gutenberg, with an optional **AWS backend** for durable submissions, templates, workflows, and admin automation.

This repository contains the source code and frontend modules for the **free / OSS parts** of the WP Suite Flow plugin.

> **Published npm packages used by Flow include:**
> - `@smart-cloud/flow-core`
> - `@smart-cloud/wpsuite-core`
> - (shared dependency) `@smart-cloud/gatey-core`

![Node.js](https://img.shields.io/badge/node-%3E%3D16.x-blue.svg)
![PHP](https://img.shields.io/badge/PHP-%3E%3D8.1-blue)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

---

## Documentation

You can find the plugin's continuously expanding documentation at:  
https://wpsuite.io/docs/

## Machine-readable resources

- AI plugin manifest: https://wpsuite.io/.well-known/flow-plugin.json
- OpenAPI spec: https://wpsuite.io/.well-known/flow-openapi.yaml

---

## What Flow does

### Free
Flow lets you build forms in Gutenberg and render them on the front end with a single React runtime per form.

Free mode supports:

- **Gutenberg form builder** with dedicated layout and field blocks
- **Front-end form rendering** with Mantine-based UI
- **Conditional logic and validation**
- **Shortcode support** via `[smartcloud-flow-form]`
- **Elementor widget support** for embedding forms outside Gutenberg
- **Direct browser submission** to the endpoint URL configured for each form

In free mode, WordPress/PHP does **not** have to proxy the request. Forms can post directly from the browser to your own endpoint.

### Pro
Pro adds backend-aware capabilities designed to work with the separately deployed **WP Suite Flow Backend** in your own AWS account.

Pro features include:

- submissions management in wp-admin
- email templates and workflow definitions
- backend form sync
- save draft / resume flows
- authenticated API access through Gatey
- workflow automation for emails, webhooks, status changes, and related events

> **Important architecture note:**  
> Backend requests are made **directly from the browser** where applicable.  
> WordPress/PHP does **not** proxy these calls by default.

---

## AWS Backend (optional, Pro-ready)

Flow is designed to integrate with a production backend deployed into **your own AWS account**.

The typical Pro setup is:

1. deploy the WP Suite Flow backend to AWS
2. register that API in Gatey
3. choose the matching protection mode for the API (`IAM` or `COGNITO`)
4. select that API in **SmartCloud → Flow Settings → API Settings**

This keeps WordPress as the editing and presentation layer while AWS handles durable submissions, workflow orchestration, and related backend automation.

---

## Project Structure

- `core/`  
	Shared JavaScript modules, transport helpers, runtime logic, and backend integration primitives.  
	Published package: `@smart-cloud/flow-core`

- `main/`  
	Base runtime JavaScript and CSS features loaded where needed on the site.

- `admin/`  
	WordPress admin interface for Flow settings and backend-aware admin tooling.

- `blocks/`  
	Gutenberg form builder blocks, field blocks, conditional logic UI, and front-end rendering support.

- `wpsuite-admin/`  
	Shared WP Suite admin interface used across WP Suite plugins.  
	Source repo: https://github.com/smartcloudsol/hub-for-wpsuiteio

- `dist/` folders  
	Compiled and minified frontend output used by the WordPress plugin.

- Plugin PHP code and metadata (for example `smartcloud-flow.php`, `readme.txt`, `composer.json`) are located in the **project root**.

⚠️ **Note:**  
The `wpsuite-core` package is not developed in this repository.  
It lives in the separate Hub repository and is published on npm as `@smart-cloud/wpsuite-core`.

---

## Installation and Build Guide

### Prerequisites
- Node.js (>= 16.x)
- Yarn or npm
- PHP >= 8.1
- Composer
- Git

### 1) Clone the repositories

You typically want Flow and the Hub repository side-by-side so local linking works cleanly:

```bash
git clone https://github.com/smartcloudsol/hub-for-wpsuiteio.git
git clone https://github.com/smartcloudsol/flow.git
```

Suggested structure:

```text
/projects/
	hub-for-wpsuiteio/
		wpsuite-core/
		wpsuite-admin/
	flow/
		core/
		main/
		admin/
		blocks/
```

### 2) Install JavaScript dependencies

```bash
# Hub repo
cd hub-for-wpsuiteio/wpsuite-core
yarn install

cd ../wpsuite-admin
yarn install

# Flow repo
cd ../../flow/core
yarn install

cd ../main
yarn install

cd ../admin
yarn install

cd ../blocks
yarn install
```

### 3) Build and link shared packages

First, build and link `wpsuite-core` from the Hub repo:

```bash
cd ../hub-for-wpsuiteio/wpsuite-core
yarn run build
npm link
```

Then build and link `flow-core`:

```bash
cd ../../flow/core
yarn run build
npm link @smart-cloud/wpsuite-core
npm link
```

If your local setup also requires Gatey shared auth/runtime integration, link the published or local `@smart-cloud/gatey-core` package as needed.

### 4) Link `flow-core` into the WordPress-facing modules

Inside the Flow modules that consume it:

```bash
# Inside flow/main, flow/admin, and flow/blocks
npm link @smart-cloud/flow-core
npm link @smart-cloud/wpsuite-core
```

If you build `wpsuite-admin` locally, follow the same linking workflow used in the Hub repository.

### 5) Build frontend modules for WordPress

Each module that ships WordPress bundles should build into its own `dist/` folder:

```bash
cd main
yarn run build-wp dist

cd ../admin
yarn run build-wp dist

cd ../blocks
yarn run build-wp dist
```

### 6) Install PHP dependencies

From the **root directory** of Flow:

```bash
composer install --no-dev --no-scripts --optimize-autoloader --classmap-authoritative
```

### 7) Development workflow

- Rebuild the module you changed (`yarn run build` or `yarn run build-wp dist`).
- If you changed `wpsuite-core` or `flow-core`, rebuild and re-link as needed.
- PHP changes are loaded by WordPress immediately.
- Use a local WordPress install for end-to-end testing of blocks, shortcode rendering, and admin flows.

---

## Packaging for Deployment

Ensure the built assets are copied into the simplified plugin layout:

- `main/dist/*` → `main/`
- `blocks/dist/*` → `blocks/`
- `admin/php/*` and `admin/dist/*` → `admin/`
- `wpsuite-admin/php/*` and `wpsuite-admin/dist/*` → `hub-for-wpsuiteio/`

Once the structure matches the layout above, create the distributable ZIP:

```bash
git archive --format zip -o smartcloud-flow.zip HEAD
```

This uses rules defined in `.gitattributes` to include only required built assets and production PHP code.

---

## External Services

Depending on configuration and edition, Flow may interact with:

- **Google reCAPTCHA v3** (optional): browser requests to Google to retrieve bot-protection tokens.
- **Customer-configured submission endpoints**: browser requests sent directly to the form endpoint URL you configure.
- **WP Suite Flow Backend** (optional, Pro): browser requests to the AWS-hosted backend deployed in the customer's AWS account.
- **Amazon Cognito** (optional): authentication flows when protected APIs use Cognito.
- **WPSuite platform services** (optional): workspace linking, licensing, and shared WP Suite admin/platform capabilities.

---

## License

MIT License

---

If you encounter issues or want to contribute, feel free to open an issue or pull request.
