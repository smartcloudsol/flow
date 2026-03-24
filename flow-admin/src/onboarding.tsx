import {
  Accordion,
  ActionIcon,
  Anchor,
  Badge,
  Button,
  Card,
  Group,
  Image,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconChevronDown,
  IconChevronUp,
  IconExternalLink,
  IconX,
} from "@tabler/icons-react";
import { __ } from "@wordpress/i18n";
import { useCallback, useMemo, useState } from "react";

import { TEXT_DOMAIN } from "@smart-cloud/flow-core";

import flowConditionalLogic from "./assets/onboarding/flow-conditional-logic.png";
import flowEditorInserter from "./assets/onboarding/flow-editor-inserter.png";
import flowFormBuilder from "./assets/onboarding/flow-form-builder.png";
import flowProSubmissions from "./assets/onboarding/flow-pro-submissions.png";
import flowProTemplates from "./assets/onboarding/flow-pro-templates.png";
import flowProWorkflows from "./assets/onboarding/flow-pro-workflows.png";
import flowProWorkflowsZapier from "./assets/onboarding/flow-pro-workflows-zapier-integration.png";
import flowWizard from "./assets/onboarding/flow-wizard-form.png";
import classes from "./onboarding.module.css";

const LOCAL_STORAGE_KEY = "flow_onboarding_collapsed";

function readCollapsedFromStorage(): boolean {
  try {
    return localStorage.getItem(LOCAL_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function writeCollapsedToStorage(value: boolean) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, value ? "true" : "false");
  } catch {
    // ignore
  }
}

type OnboardingScreenshot = {
  title: string;
  src?: string;
  alt?: string;
};

type FlowOnboardingScreenshots = Partial<{
  gettingStarted: OnboardingScreenshot[];
  freeFeatures: OnboardingScreenshot[];
  proFeatures: OnboardingScreenshot[];
}>;

export type FlowOnboardingProps = {
  screenshots?: FlowOnboardingScreenshots;
};

function ScreenshotGallery(props: {
  items: OnboardingScreenshot[];
  emptyHint: string;
}) {
  const { items, emptyHint } = props;
  const [opened, { open, close }] = useDisclosure(false);
  const [active, setActive] = useState<OnboardingScreenshot | null>(null);

  const openShot = useCallback(
    (shot: OnboardingScreenshot) => {
      setActive(shot);
      open();
    },
    [open],
  );

  if (!items?.length) {
    return (
      <Text size="sm" c="dimmed">
        {emptyHint}
      </Text>
    );
  }

  return (
    <>
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
        {items.map((shot, idx) => {
          const clickable = Boolean(shot.src);

          return (
            <Card
              key={`${shot.title}-${idx}`}
              withBorder
              padding="sm"
              className={classes.thumbCard}
              onClick={clickable ? () => openShot(shot) : undefined}
              style={{ cursor: clickable ? "pointer" : "default" }}
            >
              <Stack gap={6}>
                <Image
                  src={shot.src}
                  alt={shot.alt || shot.title}
                  radius="sm"
                  className={classes.thumbImage}
                />
                <Text size="xs" fw={600} lineClamp={3}>
                  {shot.title}
                </Text>
              </Stack>
            </Card>
          );
        })}
      </SimpleGrid>

      <Modal
        opened={opened}
        onClose={close}
        size="75rem"
        p="5rem"
        title={active?.title}
        centered
      >
        {active?.src ? (
          <Image
            src={active.src}
            alt={active.alt || active.title}
            radius="md"
          />
        ) : null}
      </Modal>
    </>
  );
}

export const FlowOnboarding = (props: FlowOnboardingProps) => {
  const [collapsed, setCollapsed] = useState<boolean>(() =>
    readCollapsedFromStorage(),
  );

  const toggleCollapsed = useCallback(() => {
    setCollapsed((value) => {
      const next = !value;
      writeCollapsedToStorage(next);
      return next;
    });
  }, []);

  const screenshots = useMemo(() => {
    const shot = props.screenshots ?? {};

    return {
      gettingStarted: shot.gettingStarted ?? [
        {
          title: __(
            "Gutenberg inserter: add the Flow Form block to a page or post.",
            TEXT_DOMAIN,
          ),
          src: flowEditorInserter,
        },
        {
          title: __(
            "Form builder canvas: arrange fields, containers, labels, and buttons.",
            TEXT_DOMAIN,
          ),
          src: flowFormBuilder,
        },
      ],
      freeFeatures: shot.freeFeatures ?? [
        {
          title: __(
            "Wizard form example: multi-step flow with step-by-step progression.",
            TEXT_DOMAIN,
          ),
          src: flowWizard,
        },
        {
          title: __(
            "Conditional logic setup: show, hide, or require fields dynamically.",
            TEXT_DOMAIN,
          ),
          src: flowConditionalLogic,
        },
      ],
      proFeatures: shot.proFeatures ?? [
        {
          title: __(
            "Submissions screen: review entries collected by the backend.",
            TEXT_DOMAIN,
          ),
          src: flowProSubmissions,
        },
        {
          title: __(
            "Templates screen: create reusable templates for emails.",
            TEXT_DOMAIN,
          ),
          src: flowProTemplates,
        },
        {
          title: __(
            "Workflows and automations: status changes, workflow steps, and webhooks.",
            TEXT_DOMAIN,
          ),
          src: flowProWorkflows,
        },
        {
          title: __(
            "Zapier integration: connect form submissions to 5,000+ apps and services.",
            TEXT_DOMAIN,
          ),
          src: flowProWorkflowsZapier,
        },
      ],
    } satisfies Required<FlowOnboardingScreenshots>;
  }, [props.screenshots]);

  return (
    <Card withBorder mt="md" maw={1280} className={classes.container}>
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <div className={classes.headerText}>
          <Title order={3} className={classes.title}>
            {__("Quick start with Flow", TEXT_DOMAIN)}
          </Title>
          <Text size="sm" c="dimmed">
            {__(
              "Start with the free form builder inside WordPress, then expand into backend-powered automations when you need them.",
              TEXT_DOMAIN,
            )}
          </Text>
        </div>

        <Group gap="xs" wrap="nowrap">
          <Button
            variant={collapsed ? "light" : "subtle"}
            leftSection={
              collapsed ? (
                <IconChevronDown size={16} />
              ) : (
                <IconChevronUp size={16} />
              )
            }
            onClick={toggleCollapsed}
          >
            {collapsed ? __("Show", TEXT_DOMAIN) : __("Collapse", TEXT_DOMAIN)}
          </Button>
          {!collapsed ? (
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={toggleCollapsed}
              aria-label={__("Dismiss", TEXT_DOMAIN)}
              title={__("Dismiss", TEXT_DOMAIN)}
            >
              <IconX size={16} />
            </ActionIcon>
          ) : null}
        </Group>
      </Group>

      {collapsed ? (
        <Text size="sm" c="dimmed" mt="sm">
          {__(
            "This guide is collapsed. Open it any time for a quick overview of Flow's free and pro capabilities.",
            TEXT_DOMAIN,
          )}
        </Text>
      ) : (
        <Accordion variant="separated" mt="md" defaultValue="getting-started">
          <Accordion.Item value="getting-started">
            <Accordion.Control>
              <Group gap="xs">
                <Text fw={700}>{__("First steps", TEXT_DOMAIN)}</Text>
                <Badge variant="light">{__("Free", TEXT_DOMAIN)}</Badge>
              </Group>
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="sm">
                <Text size="sm">
                  {__(
                    "You can publish your first Flow form without backend setup. Use WordPress as your editor, save the page, and you are ready to collect entries on your own endpoint or frontend flow.",
                    TEXT_DOMAIN,
                  )}
                </Text>
                <ul className={classes.bullets}>
                  <li>
                    {__(
                      "Open the Gutenberg editor and insert the Flow Form block into a page or post.",
                      TEXT_DOMAIN,
                    )}
                  </li>
                  <li>
                    {__(
                      "Drag in fields and layout blocks, then tailor labels, validation, and the submit button.",
                      TEXT_DOMAIN,
                    )}
                  </li>
                  <li>
                    {__(
                      "Optionally structure the form as a wizard or add conditional logic for a smarter experience.",
                      TEXT_DOMAIN,
                    )}
                  </li>
                  <li>
                    {__(
                      "Save the page and start using the form immediately. Add backend features later when your project needs them.",
                      TEXT_DOMAIN,
                    )}
                  </li>
                </ul>
                <Group gap="xs">
                  <Anchor
                    href="https://wpsuite.io/flow/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {__("Flow product page", TEXT_DOMAIN)}
                  </Anchor>
                  <IconExternalLink size={14} />
                  <Anchor
                    href="https://wpsuite.io/docs/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {__("Full documentation", TEXT_DOMAIN)}
                  </Anchor>
                  <IconExternalLink size={14} />
                </Group>
                <ScreenshotGallery
                  items={screenshots.gettingStarted}
                  emptyHint={__(
                    "Add screenshots for block insertion and the basic editor canvas.",
                    TEXT_DOMAIN,
                  )}
                />
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="free-features">
            <Accordion.Control>
              <Group gap="xs">
                <Text fw={700}>
                  {__("Free features to highlight", TEXT_DOMAIN)}
                </Text>
                <Badge variant="light">{__("Free", TEXT_DOMAIN)}</Badge>
              </Group>
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="sm">
                <Text size="sm">
                  {__(
                    "Lead with what works immediately in WordPress: flexible form building, responsive layouts, wizard-style forms, conditional logic, and custom endpoints.",
                    TEXT_DOMAIN,
                  )}
                </Text>
                <ul className={classes.bullets}>
                  <li>
                    {__(
                      "Build simple or complex forms with reusable layout blocks and a flexible editing surface.",
                      TEXT_DOMAIN,
                    )}
                  </li>
                  <li>
                    {__(
                      "Turn long forms into multi-step wizards for a cleaner completion flow.",
                      TEXT_DOMAIN,
                    )}
                  </li>
                  <li>
                    {__(
                      "Use conditional logic to reveal, require, enable, or update fields based on user input.",
                      TEXT_DOMAIN,
                    )}
                  </li>
                  <li>
                    {__(
                      "Send data to your own endpoint when you want to integrate with custom systems without the Flow backend.",
                      TEXT_DOMAIN,
                    )}
                  </li>
                </ul>
                <ScreenshotGallery
                  items={screenshots.freeFeatures}
                  emptyHint={__(
                    "Add screenshots for wizard forms and conditional logic setup.",
                    TEXT_DOMAIN,
                  )}
                />
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="pro-features">
            <Accordion.Control>
              <Group gap="xs">
                <Text fw={700}>
                  {__("Backend-powered Pro capabilities", TEXT_DOMAIN)}
                </Text>
                <Badge color="violet" variant="light">
                  {__("Pro", TEXT_DOMAIN)}
                </Badge>
              </Group>
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="sm">
                <Text size="sm">
                  {__(
                    "Once the site is connected to WPSuite and the backend is configured, Flow expands into a fuller operations layer.",
                    TEXT_DOMAIN,
                  )}
                </Text>
                <ul className={classes.bullets}>
                  <li>
                    {__(
                      "Save and continue drafts for longer forms.",
                      TEXT_DOMAIN,
                    )}
                  </li>
                  <li>
                    {__(
                      "Review submissions centrally and manage their lifecycle.",
                      TEXT_DOMAIN,
                    )}
                  </li>
                  <li>
                    {__(
                      "Create email templates, workflows, and webhook automations.",
                      TEXT_DOMAIN,
                    )}
                  </li>
                  <li>
                    {__(
                      "Keep WordPress as the editing layer while AWS handles backend storage and orchestration.",
                      TEXT_DOMAIN,
                    )}
                  </li>
                </ul>
                <ScreenshotGallery
                  items={screenshots.proFeatures}
                  emptyHint={__(
                    "Add screenshots for submissions and workflow automation screens.",
                    TEXT_DOMAIN,
                  )}
                />
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      )}
    </Card>
  );
};
