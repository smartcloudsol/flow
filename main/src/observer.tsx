// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const elementorFrontend: any;

type MountTask = () => void;

type WindowWithIdleCallback = Window & {
  requestIdleCallback?: (
    callback: () => void,
    options?: { timeout: number },
  ) => number;
};

function scheduleAfterInitialPaint(task: MountTask, timeout = 1500) {
  const runtimeWindow = window as WindowWithIdleCallback;

  const runWhenIdle = () => {
    if (typeof runtimeWindow.requestIdleCallback === "function") {
      runtimeWindow.requestIdleCallback(() => task(), { timeout });
    } else {
      setTimeout(task, 300);
    }
  };

  runtimeWindow.requestAnimationFrame(() => {
    runtimeWindow.requestAnimationFrame(runWhenIdle);
  });
}

export const observe = () => {
  const mountForm = (el: HTMLElement) => {
    if (!el?.id || jQuery(el).data("rendered")) return;
    jQuery(document).trigger("smartcloud-flow-form-block", el.id);
  };

  const mountContentRoot = (el: HTMLElement) => {
    if (!el?.id || jQuery(el).data("rendered")) return;
    jQuery(document).trigger("smartcloud-flow-content-root-block", el.id);
  };

  const mount = () => {
    jQuery(".smartcloud-flow-form").each((_idx, n) => {
      mountForm(n);
    });
    jQuery(".smartcloud-flow-content-root").each((_idx, n) => {
      mountContentRoot(n);
    });
  };

  // Initial mount on DOM ready
  jQuery(() => {
    scheduleAfterInitialPaint(mount, 2000);
  });

  // Elementor support
  jQuery(window).on("elementor/frontend/init", function () {
    if (elementorFrontend?.hooks) {
      elementorFrontend.hooks.addAction(
        "frontend/element_ready/shortcode.default",
        () => {
          mount();
        },
      );
      elementorFrontend.hooks.addAction(
        "frontend/element_ready/smartcloud_flow_form.default",
        () => {
          jQuery(".smartcloud-flow-form").each((_idx, n) => {
            mountForm(n);
          });
        },
      );
      elementorFrontend.hooks.addAction(
        "frontend/element_ready/smartcloud_flow_content_root.default",
        () => {
          jQuery(".smartcloud-flow-content-root").each((_idx, n) => {
            mountContentRoot(n);
          });
        },
      );
    }
  });
};
