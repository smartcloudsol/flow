// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const elementorFrontend: any;

export const observe = () => {
  const mountForm = (el: HTMLElement) => {
    if (!el?.id || jQuery(el).data("rendered")) return;
    jQuery(document).trigger("smartcloud-flow-form-block", el.id);
  };

  // Initial mount on DOM ready
  jQuery(() => {
    jQuery(".smartcloud-flow-form").each((_idx, n) => {
      mountForm(n);
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
    }
  });
};
