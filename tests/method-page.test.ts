import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import MethodPage from "@/app/metode/page";

describe("method page model contract", () => {
  it("explains day-level phenology and how it affects every forecast horizon", () => {
    const html = renderToStaticMarkup(createElement(MethodPage));

    expect(html).toContain("l’1 d’agost encara combina juliol i agost");
    expect(html).toContain("el 31 ja transita cap al setembre");
    expect(html).toContain("Cada punt de +1 a +5 dies torna a executar el mateix model");
    expect(html).toContain("la fenologia <b>P</b> avança dia a dia");
    expect(html).toContain("conserven l’historial verificat d’AROME");
    expect(html).toContain("hores futures d’ECMWF");
    expect(html).toContain("no una predicció de l’aparició de bolets");
    expect(html).toContain("IFS HRES per a la projecció");
  });
});
