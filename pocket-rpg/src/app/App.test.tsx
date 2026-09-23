import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("Pocket RPG app", () => {
  it("creates a character and shows the starting city", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /начать игру/i }));
    expect(screen.getByText("Тилланиум")).toBeTruthy();
    expect(screen.getByText(/Сила: 10/)).toBeTruthy();
  });
});
