import { beforeEach, describe, expect, it, vi } from "vitest";
const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("../../src/lib/supabase", () => ({ supabase: { from } }));
import { deleteReadNotification } from "../../src/lib/services/notifications";

describe("read notification deletion", () => {
  const query = {
    delete: vi.fn(),
    eq: vi.fn(),
    select: vi.fn(),
    maybeSingle: vi.fn(),
  };
  beforeEach(() => {
    vi.resetAllMocks();
    from.mockReturnValue(query);
    query.delete.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.select.mockReturnValue(query);
  });
  it("requests deletion only for the requested read notification", async () => {
    query.maybeSingle.mockResolvedValue({ data: { id: "owned" }, error: null });
    await deleteReadNotification("owned");
    expect(from).toHaveBeenCalledWith("notifications");
    expect(query.delete).toHaveBeenCalledOnce();
    expect(query.eq.mock.calls).toEqual([
      ["id", "owned"],
      ["read", true],
    ]);
    expect(query.select).toHaveBeenCalledWith("id");
  });
  it("does not pretend an unread, missing or denied notification was deleted", async () => {
    query.maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(deleteReadNotification("unavailable")).rejects.toThrow(
      "Notification was not deleted",
    );
  });
  it("surfaces backend failures without reporting success", async () => {
    const error = new Error("Network unavailable");
    query.maybeSingle.mockResolvedValue({ data: null, error });
    await expect(deleteReadNotification("owned")).rejects.toBe(error);
  });
});
