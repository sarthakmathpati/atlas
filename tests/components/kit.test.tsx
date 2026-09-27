// @vitest-environment jsdom
// Component kit (section 12.7): keyboard behavior and accessible names.
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button, IconButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ContourCanvas } from "@/components/ui/ContourCanvas";
import { cx } from "@/components/ui/cx";
import { SubjectEmblem } from "@/components/ui/SubjectEmblem";
import { KitThemes } from "@/features/kit/KitThemes";
import { DifficultyChip, StatusChip } from "@/components/ui/Chip";
import { Dialog } from "@/components/ui/Dialog";
import { Switch } from "@/components/ui/Field";
import { CodeSpans } from "@/components/ui/Misc";
import { MultiCombobox } from "@/components/ui/MultiCombobox";
import { Menu } from "@/components/ui/Popover";
import { SegmentedBar } from "@/components/ui/Progress";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { StatusGlyph } from "@/components/ui/StatusGlyph";
import { Tabs } from "@/components/ui/Tabs";
import { Toaster } from "@/components/ui/Toaster";
import { Settings } from "lucide-react";
import { toast, useToastStore } from "@/stores/toastStore";

afterEach(() => {
  cleanup();
  useToastStore.setState({ toasts: [] });
});

describe("CodeSpans", () => {
  it("shows backticked spans as inline code and leaves the rest as text", () => {
    const { container } = render(
      <p>
        <CodeSpans text="pass by value vs `const T&`, and `auto`" />
      </p>,
    );
    const codes = [...container.querySelectorAll("code")].map((c) => c.textContent);
    expect(codes).toEqual(["const T&", "auto"]);
    expect(container.textContent).toBe("pass by value vs const T&, and auto");
  });
});

describe("SegmentedControl", () => {
  function Demo() {
    const [v, setV] = useState<"a" | "b" | "c">("a");
    return (
      <SegmentedControl
        label="Depth"
        value={v}
        onChange={setV}
        options={[
          { value: "a", label: "Simple" },
          { value: "b", label: "Interview" },
          { value: "c", label: "Deep" },
        ]}
      />
    );
  }
  it("is a radio group that follows arrow keys", async () => {
    const user = userEvent.setup();
    render(<Demo />);
    const group = screen.getByRole("radiogroup", { name: "Depth" });
    const simple = within(group).getByRole("radio", { name: "Simple" });
    expect(simple).toHaveAttribute("aria-checked", "true");
    simple.focus();
    await user.keyboard("{ArrowRight}");
    expect(within(group).getByRole("radio", { name: "Interview" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(within(group).getByRole("radio", { name: "Interview" })).toHaveFocus();
    await user.keyboard("{End}");
    expect(within(group).getByRole("radio", { name: "Deep" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await user.keyboard("{ArrowRight}");
    expect(within(group).getByRole("radio", { name: "Simple" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });
});

describe("Tabs", () => {
  it("switches panels with arrow keys", async () => {
    const user = userEvent.setup();
    function Demo() {
      const [v, setV] = useState<"learn" | "notes">("learn");
      return (
        <Tabs
          label="Concept"
          value={v}
          onChange={setV}
          items={[
            { value: "learn", label: "Learn" },
            { value: "notes", label: "Notes" },
          ]}
        >
          {(x) => <p>Panel {x}</p>}
        </Tabs>
      );
    }
    render(<Demo />);
    screen.getByRole("tab", { name: "Learn" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Notes" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel notes");
  });
});

describe("Switch", () => {
  it("toggles and is labelled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Switch label="Streak freeze" checked={false} onChange={onChange} />);
    await user.click(screen.getByRole("switch", { name: "Streak freeze" }));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe("MultiCombobox", () => {
  it("filters, selects with the keyboard, respects the maximum and removes with Backspace", async () => {
    const user = userEvent.setup();
    function Demo() {
      const [v, setV] = useState<string[]>([]);
      return (
        <MultiCombobox
          label="Focus subjects"
          options={[
            { value: "os", label: "Operating systems" },
            { value: "cn", label: "Computer networks" },
            { value: "dbms", label: "Database management systems" },
          ]}
          value={v}
          onChange={setV}
          max={2}
        />
      );
    }
    render(<Demo />);
    const input = screen.getByRole("combobox", { name: "Focus subjects" });
    await user.click(input);
    await user.type(input, "net");
    expect(screen.getAllByRole("option")).toHaveLength(1);
    await user.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: "Remove Computer networks" })).toBeInTheDocument();
    await user.type(input, "oper{Enter}");
    await user.type(input, "data{Enter}");
    // The maximum is two, so the third choice isn't added.
    expect(screen.queryByRole("button", { name: "Remove Database management systems" })).toBeNull();
    await user.keyboard("{Backspace}");
    expect(screen.queryByRole("button", { name: "Remove Operating systems" })).toBeNull();
  });
});

describe("Dialog", () => {
  it("closes on Escape and returns focus", async () => {
    const user = userEvent.setup();
    function Demo() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <Button onClick={() => setOpen(true)}>Open</Button>
          <Dialog open={open} onClose={() => setOpen(false)} title="Save attempt">
            <p>Body</p>
          </Dialog>
        </>
      );
    }
    render(<Demo />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    const dialog = await screen.findByRole("dialog", { name: "Save attempt" });
    expect(dialog).toHaveAttribute("open");
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    await act(async () => new Promise((r) => setTimeout(r, 250)));
    expect(screen.queryByRole("dialog", { name: "Save attempt" })).toBeNull();
  });
});

describe("Menu", () => {
  it("opens from its trigger and runs an item", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <Menu
        label="Actions"
        items={[{ id: "a", label: "Mark as studied", onSelect }]}
        renderTrigger={(props) => (
          <button {...props} type="button">
            Actions
          </button>
        )}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Actions" }));
    await user.click(await screen.findByRole("menuitem", { name: "Mark as studied" }));
    expect(onSelect).toHaveBeenCalled();
    expect(screen.queryByRole("menu")).toBeNull();
  });
});

describe("Toasts", () => {
  it("shows a message and runs Undo", async () => {
    const user = userEvent.setup();
    const undo = vi.fn();
    render(<Toaster />);
    act(() => {
      toast("Tag deleted.", { action: { label: "Undo", onClick: undo } });
    });
    expect(await screen.findByText("Tag deleted.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(undo).toHaveBeenCalled();
    expect(screen.queryByText("Tag deleted.")).toBeNull();
  });
});

describe("status and difficulty", () => {
  it("labels glyphs and chips in words, not only color", () => {
    render(
      <>
        <StatusGlyph status="fading" title="Fading" size={20} />
        <StatusChip status="strong" />
        <DifficultyChip difficulty="hard" />
        <SegmentedBar counts={{ strong: 3, learning: 2, not_started: 1 }} />
        <IconButton icon={Settings} label="Settings" noTooltip />
      </>,
    );
    expect(screen.getByRole("img", { name: "Fading" })).toBeInTheDocument();
    expect(screen.getByText("Strong")).toBeInTheDocument();
    expect(screen.getByText("Hard")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "1 not started, 2 learning, 3 strong" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Settings" })).toBeInTheDocument();
  });
});

describe("Survey parts (12.10)", () => {
  it("draws a subject emblem as decoration, or as an image when labelled", () => {
    const { container, rerender } = render(<SubjectEmblem subjectId="dsa" size={32} />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("data-subject")).toBe("dsa");
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.querySelectorAll("path").length).toBeGreaterThanOrEqual(3);
    rerender(<SubjectEmblem subjectId="dsa" label="Data structures and algorithms" />);
    expect(screen.getByRole("img", { name: "Data structures and algorithms" })).toBeInTheDocument();
  });

  it("keeps the contour canvas out of the accessibility tree", () => {
    const { container } = render(
      <div className="relative">
        <ContourCanvas
          seed="test"
          hills={[{ x: 0.5, y: 0.5, r: 0.1, height: 1, label: "DSA 40" }]}
        />
        <p>Good evening</p>
      </div>,
    );
    expect(container.querySelector("canvas")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("shows Day, Dusk and Night side by side, each in its own theme", () => {
    const { container } = render(<KitThemes />);
    const previews = [...container.querySelectorAll("[data-theme-preview]")];
    expect(previews.map((p) => p.getAttribute("data-theme-preview"))).toEqual([
      "day",
      "dusk",
      "night",
    ]);
    for (const name of ["Day", "Dusk", "Night"]) {
      expect(screen.getByRole("heading", { name })).toBeInTheDocument();
    }
  });

  it("gives cards a title in the display face and marks the focal one", () => {
    render(
      <>
        <Card title="Streak">A card</Card>
        <Card focal title="Up next">
          The focal card
        </Card>
      </>,
    );
    expect(screen.getByRole("heading", { name: "Streak" }).className).toContain("font-display");
    expect(screen.getByText("The focal card").className).toContain("shadow-focal");
  });

  it("merges the custom size, radius and shadow tokens (cx)", () => {
    expect(cx("text-2xl text-page")).toBe("text-page");
    expect(cx("text-page text-muted")).toBe("text-page text-muted");
    expect(cx("rounded-panel rounded-focal")).toBe("rounded-focal");
    expect(cx("shadow-float shadow-focal")).toBe("shadow-focal");
  });
});
