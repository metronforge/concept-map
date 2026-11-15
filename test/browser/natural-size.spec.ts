import { test, expect } from "@playwright/test";

for (const fontSize of [16, 20])
  for (const natural of [240, 1800])
    test(`map ${natural} scales to ${fontSize}px page text and shrinks to fit`, async ({
      page,
    }) => {
      await page.goto("/integration/");
      await page.addStyleTag({ path: "css/concept-map.css" });
      await page.addStyleTag({
        content: `.map-figure{display:block;margin:0} body{font-size:${fontSize}px;margin:0} #sizing{width:100%}`,
      });
      await page.evaluate(async (natural) => {
        const { mount } = await import("/assets/integration.js");
        const map = JSON.parse(
          document.querySelector("#server script")!.textContent!,
        );
        map.viewBox = [natural, 600];
        const csp = document.createElement("meta");
        csp.httpEquiv = "Content-Security-Policy";
        csp.content = "style-src-attr 'none'";
        document.head.append(csp);
        document.body.replaceChildren();
        const host = document.createElement("div");
        host.id = "sizing";
        document.body.append(host);
        mount(host, map);
        await document.fonts.ready;
      }, natural);
      for (const viewport of [1280, 390, 1280]) {
        await page.setViewportSize({ width: viewport, height: 1000 });
        await expect
          .poll(async () =>
            page.locator(".map svg").evaluate((el) => {
              const svg = el as SVGSVGElement;
              const parent = getComputedStyle(el.parentElement!);
              const available =
                el.parentElement!.clientWidth -
                parseFloat(parent.paddingLeft) -
                parseFloat(parent.paddingRight);
              return Math.abs(
                svg.getBoundingClientRect().width -
                  Math.min(Number(svg.getAttribute("width")), available),
              );
            }),
          )
          .toBeLessThan(1);
        const actual = await page.locator(".map svg").evaluate((el) => {
          const svg = el as SVGSVGElement,
            box = svg.getBoundingClientRect(),
            parent = el.parentElement!.getBoundingClientRect();
          return {
            width: box.width,
            attr: Number(svg.getAttribute("width")),
            inline: svg.getAttribute("style"),
            centered: Math.abs(
              (box.left + box.right) / 2 - (parent.left + parent.right) / 2,
            ),
            overflow: document.documentElement.scrollWidth - innerWidth,
            labels: [
              ...svg.querySelectorAll(".node text:not(.tag), .etext"),
            ].map(
              (label) =>
                parseFloat(getComputedStyle(label).fontSize) *
                svg.getScreenCTM()!.a,
            ),
          };
        });
        expect(actual.attr).toBeCloseTo((natural * fontSize) / 10.5, 4);
        expect(actual.inline).toBeNull();
        expect(actual.centered).toBeLessThan(1);
        expect(actual.overflow).toBeLessThanOrEqual(0);
        expect(actual.labels.length).toBeGreaterThan(0);
        if (natural === 240 && viewport === 1280)
          for (const label of actual.labels) {
            expect(label).toBeGreaterThanOrEqual(fontSize - 0.1);
            expect(label).toBeLessThanOrEqual(fontSize * 1.25);
          }
      }
      // Ordinary author CSS must override the presentation attribute, including under CSP.
      await page.addStyleTag({
        content: ".map-ui .map svg { width: 200px; max-width: 100%; }",
      });
      await expect
        .poll(() =>
          page
            .locator(".map svg")
            .evaluate((el) => el.getBoundingClientRect().width),
        )
        .toBeCloseTo(200, 0);
    });
