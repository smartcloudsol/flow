// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const elementorFrontend: any;

export const observe = () => {
  const mountForm = (el: HTMLElement) => {
    if (!el?.id || jQuery(el).data("rendered")) return;
    jQuery(document).trigger("smartcloud-flow-form-block", el.id);
  };

  const mountContentRoot = (el: HTMLElement) => {
    if (!el?.id || jQuery(el).data("rendered")) return;
    jQuery(document).trigger("smartcloud-flow-content-root-block", el.id);
  };

  // Initial mount on DOM ready
  jQuery(() => {
    jQuery(".smartcloud-flow-form").each((_idx, n) => {
      mountForm(n);
    });
    jQuery(".smartcloud-flow-content-root").each((_idx, n) => {
      mountContentRoot(n);
    });
  });

  // Elementor support
  jQuery(window).on("elementor/frontend/init", function () {
    if (elementorFrontend?.hooks) {
      elementorFrontend.hooks.addAction(
        "frontend/element_ready/shortcode.default",
        () => {
          jQuery(".smartcloud-flow-form").each((_idx, n) => {
            mountForm(n);
          });
          jQuery(".smartcloud-flow-content-root").each((_idx, n) => {
            mountContentRoot(n);
          });
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
