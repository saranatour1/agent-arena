import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { HealthBar } from "./HealthBar";
import { FighterSprite } from "../FighterSprite";

describe("HUD", () => {
  test("health bar width tracks HP and exposes a meter", () => {
    render(<HealthBar hp={40} name="SARA" side="left" wins={1} />);
    expect(screen.getByTestId("hp-left")).toHaveStyle({ width: "40%" });
    expect(screen.getByRole("meter", { name: "SARA health" })).toHaveAttribute("aria-valuenow", "40");
    expect(screen.getByText("SARA")).toBeInTheDocument();
  });

  test("sprites render with accessible names", () => {
    render(
      <>
        <FighterSprite who="opus" />
        <FighterSprite who="player" still="ko" />
      </>,
    );
    expect(screen.getByRole("img", { name: "OPUS" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "YOU" })).toBeInTheDocument();
  });
});
